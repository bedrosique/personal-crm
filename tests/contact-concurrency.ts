import assert from "node:assert/strict";
import { chromium, expect, type Page } from "@playwright/test";
import type postgres from "postgres";

type Fields = { name: string; phone: string; email: string; notes: string };
const first: Fields = {
  name: "First tab",
  phone: "+1 212 555-0101",
  email: "first@example.com",
  notes: "Important note from the first tab",
};
const second: Fields = {
  name: "Second tab draft",
  phone: "+1 212 555-0102",
  email: "second@example.com",
  notes: "Unsaved note from the second tab",
};
async function fill(page: Page, fields: Fields) {
  for (const [name, value] of Object.entries(fields))
    await page.locator(`[name="${name}"]`).fill(value);
}
async function assertDraft(page: Page, fields: Fields) {
  for (const [name, value] of Object.entries(fields))
    await expect(page.locator(`[name="${name}"]`)).toHaveValue(value);
}
async function submit(page: Page) {
  await page.getByRole("button", { name: "Сохранить контакт" }).click();
  await expect
    .poll(
      async () =>
        (await page.locator("main").getByRole("status").count()) +
        (await page.locator("main").getByRole("alert").count()),
    )
    .toBeGreaterThan(0);
}
async function assertStored(client: postgres.Sql, id: string, fields: Fields) {
  const [row] =
    await client`select name,phone,email,notes from contacts where id=${id}`;
  row.notes = row.notes.replace(/\r\n/g, "\n");
  assert.deepEqual(
    row,
    fields,
    "A stale save overwrote the newer contact data",
  );
}
export async function runContactConcurrencyTests(
  baseUrl: string,
  client: postgres.Sql,
) {
  const browser = await chromium.launch();
  const errors: string[] = [];
  const context = await browser.newContext();
  const tabA = await context.newPage();
  const tabB = await context.newPage();
  for (const page of [tabA, tabB])
    page.on("pageerror", (error) => errors.push(error.message));
  const fixture = async () => {
    const [row] =
      await client`insert into contacts(name,notes) values('Concurrency fixture','Original note') returning id`;
    return row.id as string;
  };
  try {
    const id = await fixture();
    await Promise.all([
      tabA.goto(`${baseUrl}/contacts/${id}`),
      tabB.goto(`${baseUrl}/contacts/${id}`),
    ]);
    await fill(tabA, first);
    await fill(tabB, second);
    await submit(tabA);
    await expect(tabA.locator("main").getByRole("status")).toHaveText(
      "Изменения сохранены",
    );
    await submit(tabB);
    await assertStored(client, id, first);
    await expect(tabB.locator("main").getByRole("alert")).toContainText(
      "другой вкладке",
    );
    await assertDraft(tabB, second);
    await expect(tabB.locator("main").getByRole("status")).toHaveCount(0);
    await submit(tabB);
    await assertStored(client, id, first);
    await assertDraft(tabB, second);
    console.log(
      "PASS: stale tab rejected; all newer fields and unsaved draft preserved, including repeated save",
    );
    const merged = { ...second, notes: first.notes + "\n" + second.notes };
    const fresh = await context.newPage();
    await fresh.goto(`${baseUrl}/contacts/${id}`);
    await fill(fresh, merged);
    await submit(fresh);
    await assertStored(client, id, merged);
    await fresh.reload();
    await assertDraft(fresh, merged);
    await fresh.close();
    console.log(
      "PASS: reviewed draft can be copied into a freshly opened card and saved",
    );
    const raceId = await fixture();
    await Promise.all([
      tabA.goto(`${baseUrl}/contacts/${raceId}`),
      tabB.goto(`${baseUrl}/contacts/${raceId}`),
    ]);
    const originalVersion = await tabA.locator('[name="version"]').inputValue();
    assert.equal(
      await tabB.locator('[name="version"]').inputValue(),
      originalVersion,
    );
    await fill(tabA, first);
    await fill(tabB, second);
    let arrived = 0;
    let release!: () => void;
    const gate = new Promise<void>((resolve) => {
      release = resolve;
    });
    for (const page of [tabA, tabB])
      await page.route(`**/contacts/${raceId}*`, async (route) => {
        if (route.request().method() === "POST") {
          arrived++;
          if (arrived === 2) release();
          await gate;
        }
        await route.continue();
      });
    // Hold the test row until both real HTTP saves are waiting in PostgreSQL.
    // This also catches a non-atomic SELECT-version-then-UPDATE implementation.
    const blocker = await client.reserve();
    let locked = false;
    try {
      await blocker`BEGIN`;
      locked = true;
      await blocker`SELECT id FROM contacts WHERE id=${raceId} FOR UPDATE`;
      await Promise.all([
        tabA.getByRole("button", { name: "Сохранить контакт" }).click(),
        tabB.getByRole("button", { name: "Сохранить контакт" }).click(),
      ]);
      await expect.poll(() => arrived, { timeout: 15000 }).toBe(2);
      await expect
        .poll(
          async () => {
            const [row] =
              await client`SELECT count(*)::int AS count FROM pg_stat_activity WHERE datname=current_database() AND query LIKE 'update "contacts"%' AND wait_event_type='Lock'`;
            return row.count;
          },
          { timeout: 15000 },
        )
        .toBe(2);
      await blocker`COMMIT`;
      locked = false;
    } finally {
      if (locked) await blocker`ROLLBACK`;
      blocker.release();
    }
    await expect
      .poll(
        async () =>
          (await tabA.locator("main").getByRole("status").count()) +
          (await tabA.locator("main").getByRole("alert").count()),
      )
      .toBe(1);
    await expect
      .poll(
        async () =>
          (await tabB.locator("main").getByRole("status").count()) +
          (await tabB.locator("main").getByRole("alert").count()),
      )
      .toBe(1);
    const aWon = (await tabA.locator("main").getByRole("status").count()) === 1;
    const winner = aWon ? tabA : tabB;
    const loser = aWon ? tabB : tabA;
    const winnerFields = aWon ? first : second;
    const loserFields = aWon ? second : first;
    await expect(loser.locator("main").getByRole("alert")).toContainText(
      "другой вкладке",
    );
    await assertStored(client, raceId, winnerFields);
    await assertDraft(loser, loserFields);
    assert.notEqual(
      await winner.locator('[name="version"]').inputValue(),
      originalVersion,
    );
    await Promise.all([
      tabA.unrouteAll({ behavior: "wait" }),
      tabB.unrouteAll({ behavior: "wait" }),
    ]);
    console.log(
      "PASS: simultaneous requests produce exactly one success and one conflict",
    );
    const nextFields = {
      ...winnerFields,
      notes: winnerFields.notes + "; second successful save",
    };
    await fill(winner, nextFields);
    await submit(winner);
    await expect(winner.locator("main").getByRole("status")).toHaveText(
      "Изменения сохранены",
    );
    await assertStored(client, raceId, nextFields);
    await submit(loser);
    await assertStored(client, raceId, nextFields);
    await assertDraft(loser, loserFields);
    console.log(
      "PASS: successful saves advance the version; repeated stale retries never overwrite",
    );
    const invalid = await context.newPage();
    await invalid.goto(`${baseUrl}/contacts/${raceId}`);
    await fill(invalid, second);
    await invalid
      .locator('[name="version"]')
      .evaluate((element: HTMLInputElement) => {
        element.value = "";
      });
    await submit(invalid);
    await expect(invalid.locator("main").getByRole("alert")).toBeVisible();
    await assertStored(client, raceId, nextFields);
    await assertDraft(invalid, second);
    await invalid.close();
    console.log("PASS: missing version cannot bypass concurrency checks");
    const [precise] =
      await client`insert into contacts(name,notes,updated_at) values('Microsecond fixture','Original note','2099-01-01T00:00:00.123456Z'::timestamptz) returning id`;
    await tabA.goto(baseUrl + "/contacts/" + precise.id);
    await expect(tabA.locator('[name="version"]')).toHaveValue(
      "2099-01-01T00:00:00.123456Z",
    );
    await fill(tabA, first);
    await submit(tabA);
    await expect(tabA.locator('[name="version"]')).toHaveValue(
      "2099-01-01T00:00:00.123457Z",
    );
    await fill(tabA, second);
    await submit(tabA);
    await expect(tabA.locator('[name="version"]')).toHaveValue(
      "2099-01-01T00:00:00.123458Z",
    );
    await assertStored(client, precise.id, second);
    console.log(
      "PASS: full microsecond precision and monotonic versions inside one millisecond, even when the database clock is behind",
    );

    await tabA.goto(`${baseUrl}/contacts/new`);
    await fill(tabA, first);
    await tabA.getByRole("button", { name: "Сохранить контакт" }).click();
    await expect(tabA.locator("main").getByRole("status")).toHaveText(
      "Изменения сохранены",
    );
    await expect(tabA.locator('[name="version"]')).not.toHaveValue("");
    const createdId = new URL(tabA.url()).pathname.split("/").pop()!;
    await assertStored(client, createdId, first);
    assert.deepEqual(errors, []);
    console.log("PASS: creating contacts still works");
  } finally {
    await browser.close();
  }
}
