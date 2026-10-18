import "dotenv/config";
import { chromium, firefox, expect } from "@playwright/test";
import fs from "node:fs";
import postgres from "postgres";
import { seedContacts } from "./seed-data";
async function main() {
  fs.mkdirSync("artifacts", { recursive: true });
  const browser = await chromium.launch();
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const sql = postgres(process.env.DATABASE_URL!, { max: 1 });
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  try {
    const [{ total }] = await sql`select count(*)::int as total from contacts`;
    await page.goto("http://127.0.0.1:3000");
    await expect(page.getByRole("heading", { name: /Контакты/ })).toBeVisible();
    await expect(
      page
        .locator('main a[href^="/contacts/"]')
        .filter({ hasNotText: "Добавить контакт" }),
    ).toHaveCount(total);
    await page.screenshot({ path: "artifacts/contacts-desktop.png" });
    const writer =
      seedContacts.find((r) => r.name.includes("Пушкин")) ?? seedContacts[0];
    await page.getByRole("searchbox").count();
    await page
      .getByRole("textbox", { name: "Поиск по имени" })
      .fill(writer.name);
    await page.getByRole("button", { name: "Найти", exact: true }).click();
    await page.getByRole("link", { name: writer.name, exact: false }).click();
    await expect(page.locator('input[name="name"]')).toHaveValue(writer.name);
    const original = await page.locator('textarea[name="notes"]').inputValue();
    const changed = original + "\nПроверка: заметка после разговора.";
    await page.locator('textarea[name="notes"]').fill(changed);
    await page.getByRole("button", { name: "Сохранить контакт" }).click();
    await expect(page.getByRole("status")).toHaveText("Изменения сохранены");
    await page.reload();
    await expect(page.locator('textarea[name="notes"]')).toHaveValue(changed);
    const [persisted] =
      await sql`select notes from contacts where id=${writer.id}`;
    if (persisted.notes.replace(/\r\n/g, "\n") !== changed)
      throw Error("Database persistence check failed");
    const other = await firefox.launch({
      firefoxUserPrefs: { "network.proxy.type": 0 },
    });
    try {
      const p = await other.newPage();
      await p.goto("http://127.0.0.1:3000/contacts/" + writer.id);
      await expect(p.locator('textarea[name="notes"]')).toHaveValue(changed);
    } finally {
      await other.close();
    }
    await page.locator('textarea[name="notes"]').fill(original);
    await page.getByRole("button", { name: "Сохранить контакт" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    for (const row of [
      seedContacts.find(
        (r) =>
          r.phone &&
          r.email &&
          r.notes.includes("Дата рождения:") &&
          r.notes.includes("Известное произведение:") &&
          r.notes.includes("Биографический факт:"),
      )!,
      seedContacts.find((r) => !r.phone && !r.email)!,
    ]) {
      await page.goto("http://127.0.0.1:3000/contacts/" + row.id);
      await expect(page.locator('input[name="phone"]')).toHaveValue(
        row.phone ?? "",
      );
      await expect(page.locator('input[name="email"]')).toHaveValue(
        row.email ?? "",
      );
      await page.screenshot({
        path: row.phone
          ? "artifacts/contact-full.png"
          : "artifacts/contact-partial.png",
      });
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("http://127.0.0.1:3000");
    await page.screenshot({ path: "artifacts/contacts-mobile.png" });
    if (
      await page.evaluate(
        () => document.documentElement.scrollWidth > window.innerWidth,
      )
    )
      throw Error("Mobile overflow");
    await page.goto("http://127.0.0.1:3000/contacts/new");
    await page
      .locator('input[name="name"]')
      .fill("Проверка CRM — тестовый контакт");
    await page.getByRole("button", { name: "Сохранить контакт" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    const newUrl = page.url().split("?")[0];
    await page
      .locator('textarea[name="notes"]')
      .fill("Тест создания контакта и сохранения заметки.");
    await page.getByRole("button", { name: "Сохранить контакт" }).click();
    await expect(page.getByRole("status")).toBeVisible();
    await page.goto(
      "http://127.0.0.1:3000/?q=" + encodeURIComponent("Проверка CRM"),
    );
    await page.getByRole("link", { name: /Проверка CRM/ }).click();
    await expect(page.locator('textarea[name="notes"]')).toHaveValue(
      "Тест создания контакта и сохранения заметки.",
    );
    await page.close();
    const reopened = await browser.newPage();
    await reopened.goto(newUrl);
    await expect(reopened.locator('textarea[name="notes"]')).toHaveValue(
      "Тест создания контакта и сохранения заметки.",
    );
    expect(errors).toEqual([]);
    console.log(
      "PASS: list, search, open, create, edit notes, reload, PostgreSQL persistence, Chromium + Firefox, reopen, full/partial cards, mobile layout",
    );
    console.log(
      "A clearly labelled test contact was retained; no existing data deleted.",
    );
  } finally {
    await browser.close();
    await sql.end();
  }
}
main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
