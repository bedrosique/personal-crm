import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Header } from "@/components/header";
import { ContactForm } from "@/components/contact-form";
export default function NewContact() {
  return (
    <>
      <Header />
      <main className="app-container app-main contact-page">
        <Link href="/" className="back-link">
          <ArrowLeft aria-hidden="true" /> Все контакты
        </Link>
        <div className="contact-heading">
          <h1 className="person-title">Новый контакт</h1>
          <p className="page-description">
            Достаточно имени. Остальное можно добавить позже.
          </p>
        </div>
        <ContactForm />
      </main>
    </>
  );
}
