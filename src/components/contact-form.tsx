"use client";
import { useActionState, useState } from "react";
import { saveContact } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { contacts } from "@/db/schema";
export function ContactForm({
  contact,
  version,
  initialSaved = false,
}: {
  contact?: typeof contacts.$inferSelect;
  version?: string;
  initialSaved?: boolean;
}) {
  const [draft, setDraft] = useState({
    name: contact?.name ?? "",
    phone: contact?.phone ?? "",
    email: contact?.email ?? "",
    notes: contact?.notes ?? "",
  });
  const [state, action, pending] = useActionState(saveContact, {
    version,
    saved: initialSaved,
  });
  const change = (field: keyof typeof draft, value: string) =>
    setDraft((current) => ({ ...current, [field]: value }));
  return (
    <>
      {state.saved && (
        <p role="status" className="feedback feedback--success">
          Изменения сохранены
        </p>
      )}
      <div className="contact-sheet">
        <form action={action} className="contact-fields">
          {contact && (
            <>
              <input type="hidden" name="id" value={contact.id} />
              <input type="hidden" name="version" value={state.version ?? ""} />
            </>
          )}
          <label>
            <span className="label">
              Имя <span className="required-indicator">*</span>
            </span>
            <Input
              name="name"
              required
              maxLength={200}
              value={draft.name}
              onChange={(event) => change("name", event.target.value)}
              placeholder="Как зовут человека"
            />
          </label>
          <div className="contact-methods">
            <label>
              <span className="label">Телефон</span>
              <Input
                name="phone"
                type="tel"
                maxLength={80}
                value={draft.phone}
                onChange={(event) => change("phone", event.target.value)}
                placeholder="Не указан"
              />
            </label>
            <label>
              <span className="label">Электронная почта</span>
              <Input
                name="email"
                type="email"
                maxLength={254}
                value={draft.email}
                onChange={(event) => change("email", event.target.value)}
                placeholder="Не указана"
              />
            </label>
          </div>
          <label>
            <span className="label">Заметки</span>
            <Textarea
              name="notes"
              maxLength={50000}
              value={draft.notes}
              onChange={(event) => change("notes", event.target.value)}
              placeholder="Откуда знакомы, о чём говорили, что важно помнить…"
            />
          </label>
          {state.error && (
            <p role="alert" className="feedback feedback--error">
              {state.error}
            </p>
          )}
          <div className="form-actions">
            <Button type="submit" disabled={pending}>
              {pending ? "Сохраняем…" : "Сохранить контакт"}
            </Button>
            <p className="form-hint">Сохранится в вашей базе</p>
          </div>
        </form>
      </div>
    </>
  );
}
