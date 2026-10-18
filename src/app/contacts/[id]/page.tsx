import Link from "next/link";
import { notFound } from "next/navigation";
import { eq, getTableColumns } from "drizzle-orm";
import { contactVersion } from "@/db/contact-version";
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
  const [contact] = await db
    .select({ ...getTableColumns(contacts), version: contactVersion })
    .from(contacts)
    .where(eq(contacts.id, id));
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
        <ContactForm
          key={contact.id}
          contact={contact}
          version={contact.version}
          initialSaved={saved === "1"}
        />
      </main>
    </>
  );
}
