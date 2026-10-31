"use client";
import { Button } from "@/components/ui/button";
import { Header } from "@/components/header";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <>
      <Header />
      <main className="app-container app-main state-page">
        <h1 className="state-title">Не удалось загрузить контакты</h1>
        <p className="state-copy">
          Проверьте, что база данных запущена, и повторите попытку.
        </p>
        <Button onClick={reset}>Попробовать ещё раз</Button>
      </main>
    </>
  );
}
