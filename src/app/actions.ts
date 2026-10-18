"use server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import {
  contactVersion,
  isContactVersion,
  nextContactVersion,
} from "@/db/contact-version";
import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export type FormState = { error?: string; version?: string; saved?: boolean };
export async function saveContact(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const name = String(data.get("name") ?? "").trim();
  const phone = String(data.get("phone") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const notes = String(data.get("notes") ?? "");
  const id = String(data.get("id") ?? "");
  const version = String(data.get("version") ?? "");
  const fail = (error: string): FormState => ({ error, version, saved: false });
  if (!name || name.length > 200)
    return fail("Укажите имя длиной до 200 символов.");
  if (phone.length > 80 || email.length > 254 || notes.length > 50000)
    return fail("Слишком длинное значение поля.");
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail("Проверьте адрес электронной почты.");
  if (id && !/^[0-9a-f-]{36}$/i.test(id))
    return fail("Не удалось найти контакт.");
  if (id && !isContactVersion(version))
    return fail(
      "Не удалось проверить версию карточки. Ваши изменения остались в форме. Скопируйте их и откройте карточку заново.",
    );
  let savedId = id;
  let savedVersion: string | undefined;
  try {
    if (id) {
      // The version check and write are atomic; PostgreSQL rechecks it after a concurrent update.
      const [updated] = await db
        .update(contacts)
        .set({
          name,
          phone: phone || null,
          email: email || null,
          notes,
          updatedAt: nextContactVersion,
        })
        .where(
          and(
            eq(contacts.id, id),
            sql`${contacts.updatedAt} = ${version}::timestamptz`,
          ),
        )
        .returning({ id: contacts.id, version: contactVersion });
      if (!updated) {
        const [existing] = await db
          .select({ id: contacts.id })
          .from(contacts)
          .where(eq(contacts.id, id));
        return fail(
          existing
            ? "Этот контакт уже изменён в другой вкладке. Новые данные не перезаписаны. Ваши изменения остались в форме: скопируйте их и откройте актуальную карточку в новой вкладке."
            : "Контакт больше не существует. Ваши изменения остались в форме.",
        );
      }
      savedVersion = updated.version;
    } else {
      const [created] = await db
        .insert(contacts)
        .values({ name, phone: phone || null, email: email || null, notes })
        .returning({ id: contacts.id });
      savedId = created.id;
    }
  } catch {
    return fail("Не удалось сохранить. Попробуйте ещё раз.");
  }
  revalidatePath("/");
  revalidatePath("/contacts/" + savedId);
  if (id) return { saved: true, version: savedVersion };
  redirect("/contacts/" + savedId + "?saved=1");
}
