import Link from "next/link";
export default function NotFound() {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="mb-5 text-2xl">Контакт не найден</h1>
      <Link href="/" className="text-primary">
        Вернуться к контактам
      </Link>
    </main>
  );
}
