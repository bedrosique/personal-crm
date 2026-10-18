import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { Header } from "@/components/header";
import { ContactForm } from "@/components/contact-form";
export const dynamic = "force-dynamic";
export default async function ContactPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ saved?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [contact] = await db.select().from(contacts).where(eq(contacts.id, id));
  if (!contact) notFound();
  const { saved } = await searchParams;
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm text-primary">
          ← Все контакты
        </Link>
        <p className="mb-2 mt-7 text-xs uppercase tracking-widest text-primary">
          Карточка контакта
        </p>
        <h1 className="mb-3 text-3xl font-semibold">{contact.name}</h1>
        <p className="mb-7 text-sm text-stone-500">
          Важные детали и история вашего общения.
        </p>
        {saved && (
          <p
            role="status"
            className="mb-5 rounded-xl bg-secondary p-4 text-sm text-primary"
          >
            Изменения сохранены
          </p>
        )}
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
          <ContactForm
            key={contact.updatedAt.toISOString()}
            contact={contact}
          />
        </div>
      </main>
    </>
  );
}
