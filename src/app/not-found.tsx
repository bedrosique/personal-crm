import Link from "next/link";
import { Header } from "@/components/header";
export default function NotFound() {
  return (
    <>
      <Header />
      <main className="app-container app-main state-page">
        <h1 className="state-title">Контакт не найден</h1>
        <Link href="/" className="back-link">
          Вернуться к контактам
        </Link>
      </main>
    </>
  );
}
