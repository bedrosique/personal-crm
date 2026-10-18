import Link from "next/link";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { Search, Plus, ArrowUpRight, UserRound } from "lucide-react";
import { Header } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
export const dynamic = "force-dynamic";
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = "" } = await searchParams;
  const query = q.slice(0, 200).trim();
  const rows = await db
    .select()
    .from(contacts)
    .where(
      query
        ? sql`strpos(lower(${contacts.name}),lower(${query})) > 0`
        : undefined,
    )
    .orderBy(asc(contacts.name));
  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(contacts);
  return (
    <>
      <Header />
      <main className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="mb-9 flex flex-wrap items-end justify-between gap-5">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[.18em] text-primary">
              Ваш круг общения
            </p>
            <h1 className="text-4xl font-semibold tracking-tight">
              Контакты{" "}
              <span className="ml-2 text-2xl font-normal text-stone-400">
                {total}
              </span>
            </h1>
            <p className="mt-3 text-sm text-stone-500">
              Помнить людей. Сохранять контекст. Оставаться на связи.
            </p>
          </div>
          <Link
            href="/contacts/new"
            className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-medium text-white"
          >
            <Plus size={18} />
            Добавить контакт
          </Link>
        </div>
        <form className="mb-7 flex gap-3" role="search">
          <div className="relative flex-1">
            <Search
              size={19}
              className="absolute left-4 top-4 text-stone-400"
            />
            <Input
              name="q"
              aria-label="Поиск по имени"
              placeholder="Найти человека по имени…"
              defaultValue={q}
              className="pl-12"
            />
          </div>
          <Button variant="outline" type="submit">
            Найти
          </Button>
          {query && (
            <Link href="/" className="self-center text-sm text-primary">
              Сбросить
            </Link>
          )}
        </form>
        <div className="mb-4 flex justify-between text-xs text-stone-500">
          <span>
            {query ? "Результаты поиска: " + rows.length : "Все контакты"}
          </span>
          <span>По алфавиту</span>
        </div>
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="hidden grid-cols-[1.5fr_1fr_1.3fr_24px] gap-5 border-b border-border bg-stone-50 px-6 py-3 text-xs text-stone-500 md:grid">
            <span>Имя</span>
            <span>Телефон</span>
            <span>Электронная почта</span>
            <span />
          </div>
          {rows.map((c, i) => (
            <Link
              key={c.id}
              href={"/contacts/" + c.id}
              className="group grid grid-cols-[1fr_20px] items-center gap-5 border-b border-border px-5 py-4 last:border-0 hover:bg-secondary/60 md:grid-cols-[1.5fr_1fr_1.3fr_24px] md:px-6"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  className={
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-medium " +
                    (i % 3 === 0
                      ? "bg-[#e8e4f1] text-[#76618a]"
                      : i % 3 === 1
                        ? "bg-[#f6eadb] text-[#95704a]"
                        : "bg-secondary text-primary")
                  }
                >
                  {c.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <span className="truncate text-sm font-medium">{c.name}</span>
              </div>
              <span className="hidden text-sm text-stone-500 md:block">
                {c.phone || "—"}
              </span>
              <span className="hidden truncate text-sm text-stone-500 md:block">
                {c.email || "—"}
              </span>
              <ArrowUpRight
                size={17}
                className="text-stone-400 group-hover:text-primary"
              />
            </Link>
          ))}
          {!rows.length && (
            <div className="px-5 py-20 text-center">
              <UserRound className="mx-auto mb-4 text-stone-400" />
              <h2 className="font-medium">
                {query ? "Никого не нашли" : "Здесь будут ваши контакты"}
              </h2>
              <p className="mt-2 text-sm text-stone-500">
                {query
                  ? "Попробуйте другую часть имени."
                  : "Добавьте первого человека, которого хотите помнить."}
              </p>
            </div>
          )}
        </div>
        <p className="mt-6 text-xs text-stone-400">
          Биографии писателей взяты из Wikidata. Их телефоны и email —
          исключительно вымышленные тестовые данные.
        </p>
      </main>
    </>
  );
}
