"use server";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
export type FormState = { error?: string };
export async function saveContact(
  _state: FormState,
  data: FormData,
): Promise<FormState> {
  const name = String(data.get("name") ?? "").trim();
  const phone = String(data.get("phone") ?? "").trim();
  const email = String(data.get("email") ?? "").trim();
  const notes = String(data.get("notes") ?? "");
  const id = String(data.get("id") ?? "");
  if (!name || name.length > 200)
    return { error: "Укажите имя длиной до 200 символов." };
  if (phone.length > 80 || email.length > 254 || notes.length > 50000)
    return { error: "Слишком длинное значение поля." };
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: "Проверьте адрес электронной почты." };
  if (id && !/^[0-9a-f-]{36}$/i.test(id))
    return { error: "Не удалось найти контакт." };
  let savedId = id;
  try {
    if (id) {
      const result = await db
        .update(contacts)
        .set({
          name,
          phone: phone || null,
          email: email || null,
          notes,
          updatedAt: new Date(),
        })
        .where(eq(contacts.id, id))
        .returning({ id: contacts.id });
      if (!result.length) return { error: "Контакт не найден." };
    } else {
      const [row] = await db
        .insert(contacts)
        .values({ name, phone: phone || null, email: email || null, notes })
        .returning({ id: contacts.id });
      savedId = row.id;
    }
  } catch {
    return { error: "Не удалось сохранить. Попробуйте ещё раз." };
  }
  revalidatePath("/");
  revalidatePath("/contacts/" + savedId);
  redirect("/contacts/" + savedId + "?saved=1");
}
