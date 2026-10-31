import Link from "next/link";
import { ArrowLeft } from "lucide-react";
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
      <main className="app-container app-main contact-page">
        <Link href="/" className="back-link">
          <ArrowLeft aria-hidden="true" /> Все контакты
        </Link>
        <div className="contact-heading">
          <p className="eyebrow">Карточка контакта</p>
          <h1 className="person-title">{contact.name}</h1>
          <p className="page-description">
            Важные детали и история вашего общения.
          </p>
        </div>
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
