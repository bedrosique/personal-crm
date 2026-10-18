"use client";
import { useActionState } from "react";
import { saveContact } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { contacts } from "@/db/schema";
export function ContactForm({
  contact,
}: {
  contact?: typeof contacts.$inferSelect;
}) {
  const [state, action, pending] = useActionState(saveContact, {});
  return (
    <form action={action} className="space-y-6">
      {contact && <input type="hidden" name="id" value={contact.id} />}
      <label>
        <span className="label">
          Имя <span className="text-primary">*</span>
        </span>
        <Input
          name="name"
          required
          maxLength={200}
          defaultValue={contact?.name}
          placeholder="Как зовут человека"
        />
      </label>
      <div className="grid gap-5 sm:grid-cols-2">
        <label>
          <span className="label">Телефон</span>
          <Input
            name="phone"
            type="tel"
            maxLength={80}
            defaultValue={contact?.phone ?? ""}
            placeholder="Не указан"
          />
        </label>
        <label>
          <span className="label">Электронная почта</span>
          <Input
            name="email"
            type="email"
            maxLength={254}
            defaultValue={contact?.email ?? ""}
            placeholder="Не указана"
          />
        </label>
      </div>
      <label>
        <span className="label">Заметки</span>
        <Textarea
          name="notes"
          maxLength={50000}
          defaultValue={contact?.notes ?? ""}
          placeholder="Откуда знакомы, о чём говорили, что важно помнить…"
        />
      </label>
      {state.error && (
        <p role="alert" className="text-red-700">
          {state.error}
        </p>
      )}
      <div className="flex items-center gap-4 border-t border-border pt-6">
        <Button type="submit" disabled={pending}>
          {pending ? "Сохраняем…" : "Сохранить контакт"}
        </Button>
        <p className="text-xs text-stone-500">Сохранится в вашей базе</p>
      </div>
    </form>
  );
}
