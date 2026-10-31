import Link from "next/link";
export function Header() {
  return (
    <header className="app-header">
      <div className="app-container app-header-inner">
        <Link href="/" className="app-brand" aria-label="СВЯЗИ. — все контакты">
          <span>
            СВЯЗИ<span className="app-brand-dot">.</span>
          </span>
        </Link>
        <span className="app-tagline">У каждого свои.</span>
      </div>
    </header>
  );
}
