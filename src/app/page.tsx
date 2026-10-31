import Link from "next/link";
import { db } from "@/db";
import { contacts } from "@/db/schema";
import { asc, sql } from "drizzle-orm";
import { Search, Plus, ArrowUpRight, UserRound } from "lucide-react";
import { Header } from "@/components/header";
import { Input } from "@/components/ui/input";
import { Button, buttonVariants } from "@/components/ui/button";
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
      <main className="app-container app-main">
        <div className="page-heading">
          <div>
            <p className="eyebrow">Ваш круг общения</p>
            <h1 className="page-title">
              Контакты <span className="contact-count">{total}</span>
            </h1>
            <p className="page-description">
              Помнить людей. Сохранять контекст. Оставаться на связи.
            </p>
          </div>
          <Link href="/contacts/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            Добавить контакт
          </Link>
        </div>
        <form className="search-form" role="search">
          <div className="search-field">
            <Search className="search-icon" aria-hidden="true" />
            <Input
              name="q"
              aria-label="Поиск по имени"
              placeholder="Найти человека по имени…"
              defaultValue={q}
              className="search-input"
            />
          </div>
          <Button variant="outline" type="submit">
            Найти
          </Button>
          {query && (
            <Link href="/" className="search-reset">
              Сбросить
            </Link>
          )}
        </form>
        <div className="list-summary">
          <span>
            {query ? "Результаты поиска: " + rows.length : "Все контакты"}
          </span>
          <span>По алфавиту</span>
        </div>
        <div className="contact-list">
          <div className="contact-list-heading">
            <span>Имя</span>
            <span>Телефон</span>
            <span>Электронная почта</span>
            <span />
          </div>
          {rows.map((c) => (
            <Link key={c.id} href={"/contacts/" + c.id} className="contact-row">
              <div className="contact-person">
                <span className="contact-initials" aria-hidden="true">
                  {c.name
                    .split(" ")
                    .filter(Boolean)
                    .slice(0, 2)
                    .map((s) => s[0])
                    .join("")}
                </span>
                <span className="contact-name">{c.name}</span>
              </div>
              <span className="contact-detail">{c.phone || "—"}</span>
              <span className="contact-detail">{c.email || "—"}</span>
              <ArrowUpRight className="contact-row-arrow" aria-hidden="true" />
            </Link>
          ))}
          {!rows.length && (
            <div className="empty-state">
              <UserRound aria-hidden="true" />
              <h2>{query ? "Никого не нашли" : "Здесь будут ваши контакты"}</h2>
              <p>
                {query
                  ? "Попробуйте другую часть имени."
                  : "Добавьте первого человека, которого хотите помнить."}
              </p>
            </div>
          )}
        </div>
        <p className="list-footnote">
          Биографии писателей взяты из Wikidata. Их телефоны и email —
          исключительно вымышленные тестовые данные.
        </p>
      </main>
    </>
  );
}
