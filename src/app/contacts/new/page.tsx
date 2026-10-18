import Link from "next/link";
import { Header } from "@/components/header";
import { ContactForm } from "@/components/contact-form";
export default function NewContact() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-5 py-10">
        <Link href="/" className="text-sm text-primary">
          ← Все контакты
        </Link>
        <h1 className="mb-2 mt-7 text-3xl font-semibold">Новый контакт</h1>
        <p className="mb-8 text-sm text-stone-500">
          Достаточно имени. Остальное можно добавить позже.
        </p>
        <div className="rounded-2xl border border-border bg-white p-6 sm:p-8">
          <ContactForm />
        </div>
      </main>
    </>
  );
}
