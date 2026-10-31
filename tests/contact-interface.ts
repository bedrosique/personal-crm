import assert from "node:assert/strict";
import fs from "node:fs";
import { chromium, expect, type Page } from "@playwright/test";
import type postgres from "postgres";

async function checkLayout(page: Page, width: number) {
  await page.evaluate(() => document.fonts.ready);
  const result = await page.evaluate(() => ({
    width: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    inputSizes: Array.from(
      document.querySelectorAll("input:not([type=hidden]), textarea"),
    ).map((field) => Number.parseFloat(getComputedStyle(field).fontSize)),
  }));
  assert.equal(result.width, width);
  assert.ok(result.scrollWidth <= width, `Horizontal overflow at ${width}px`);
  assert.ok(result.inputSizes.every((size) => size >= 16));
  await expect(
    page.getByRole("link", { name: "СВЯЗИ. — все контакты" }),
  ).toBeVisible();
}

export async function runContactInterfaceTests(
  baseUrl: string,
  client: postgres.Sql,
) {
  const [database] = await client`select current_database() as name`;
  assert.match(database.name, /^crm_concurrency_test_[a-f0-9]{12}$/);
  // These fixtures exist only in the temporary database owned by the test runner.
  const [contact] = await client`
    insert into contacts(name, phone, email, notes)
    values ('Алексей Миронов', '+1 212 555-0101', 'alexey@example.com',
      'Познакомились на конференции. Обсудить совместный проект.')
    returning id`;
  await client`
    insert into contacts(name, phone, email, notes) values
      ('Анна Соколова', null, 'anna@example.com', 'Познакомились на встрече.'),
      ('Дмитрий Орлов', '+1 212 555-0102', null, 'Обсудить встречу.'),
      ('Екатерина Лебедева', null, null, ''),
      ('Мария Волкова', '+1 212 555-0103', 'maria@example.com', 'Созвониться на следующей неделе.'),
      ('Михаил Громов', '+1 212 555-0104', 'mikhail@example.com', 'Знакомы по совместному проекту.')`;

  fs.mkdirSync("artifacts/svyazi-design", { recursive: true });
  const browser = await chromium.launch();
  const errors: string[] = [];
  try {
    for (const width of [393, 1440]) {
      const page = await browser.newPage({
        viewport: { width, height: width === 393 ? 852 : 1000 },
      });
      page.on("pageerror", (error) => errors.push(error.message));
      const response = await page.goto(baseUrl);
      assert.equal(response?.status(), 200);
      await expect(page).toHaveTitle("СВЯЗИ. — личная CRM");
      await checkLayout(page, width);
      await page.screenshot({
        path: `artifacts/svyazi-design/contacts-${width}.png`,
      });

      await page
        .getByRole("textbox", { name: "Поиск по имени" })
        .fill("Алексей Миронов");
      await page.getByRole("button", { name: "Найти", exact: true }).click();
      await expect(page.locator(".contact-row")).toHaveCount(1);
      await checkLayout(page, width);
      await page.screenshot({
        path: `artifacts/svyazi-design/search-${width}.png`,
      });
      await page.getByRole("link", { name: /Алексей Миронов/ }).click();
      await expect(page.locator('[name="name"]')).toHaveValue(
        "Алексей Миронов",
      );
      await expect(page.locator('[name="version"]')).not.toHaveValue("");
      await checkLayout(page, width);
      await page.screenshot({
        path: `artifacts/svyazi-design/contact-${width}.png`,
        fullPage: true,
      });

      await page.goto(`${baseUrl}/contacts/new`);
      await checkLayout(page, width);
      await page.screenshot({
        path: `artifacts/svyazi-design/new-contact-${width}.png`,
        fullPage: true,
      });
      await page.getByRole("button", { name: "Сохранить контакт" }).click();
      assert.equal(
        await page
          .locator('[name="name"]')
          .evaluate((field: HTMLInputElement) => field.validity.valueMissing),
        true,
      );
      const name = `Проверка интерфейса ${width}`;
      await page.locator('[name="name"]').fill(name);
      await page.locator('[name="phone"]').fill("+1 212 555-0105");
      await page.locator('[name="email"]').fill("interface@example.com");
      await page.locator('[name="notes"]').fill("Заметка при создании.");
      await page.getByRole("button", { name: "Сохранить контакт" }).click();
      await expect(page.locator("main").getByRole("status")).toHaveText(
        "Изменения сохранены",
      );
      const createdId = new URL(page.url()).pathname.split("/").pop()!;
      const oldVersion = await page.locator('[name="version"]').inputValue();
      await page.locator('[name="notes"]').fill("Заметка после разговора.");
      await page.getByRole("button", { name: "Сохранить контакт" }).click();
      await expect(page.locator('[name="version"]')).not.toHaveValue(
        oldVersion,
      );
      await page.reload();
      await expect(page.locator('[name="notes"]')).toHaveValue(
        "Заметка после разговора.",
      );
      const [stored] =
        await client`select name, notes from contacts where id=${createdId}`;
      assert.equal(stored.name, name);
      assert.equal(stored.notes, "Заметка после разговора.");
      await page.goto(`${baseUrl}/?q=${encodeURIComponent(name)}`);
      await expect(page.locator(".contact-row")).toHaveCount(1);
      await page.getByRole("link", { name: "Сбросить", exact: true }).click();
      await expect(
        page.getByRole("textbox", { name: "Поиск по имени" }),
      ).toHaveValue("");

      await page.goto(`${baseUrl}/?q=no_matching_contact_fixture`);
      await expect(
        page.getByRole("heading", { name: "Никого не нашли" }),
      ).toBeVisible();
      await checkLayout(page, width);
      await page.screenshot({
        path: `artifacts/svyazi-design/empty-search-${width}.png`,
      });
      await page.goto(`${baseUrl}/contacts/not-a-valid-id`);
      await expect(
        page.getByRole("heading", { name: "Контакт не найден" }),
      ).toBeVisible();
      await checkLayout(page, width);
      await page.close();
      console.log(
        `PASS: ${width}px layout, search, create, edit, reload, and empty/not-found states`,
      );
    }
    const [original] =
      await client`select name from contacts where id=${contact.id}`;
    assert.equal(original.name, "Алексей Миронов");
    assert.deepEqual(errors, []);
  } finally {
    await browser.close();
  }
}
