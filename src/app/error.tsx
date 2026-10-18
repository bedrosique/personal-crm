"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="mx-auto max-w-xl p-10">
      <h1 className="mb-4 text-2xl">Не удалось загрузить контакты</h1>
      <p className="mb-6">
        Проверьте, что база данных запущена, и повторите попытку.
      </p>
      <Button onClick={reset}>Попробовать ещё раз</Button>
    </main>
  );
}
