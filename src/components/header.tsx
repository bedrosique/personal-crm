import Link from "next/link";
import { Sprout } from "lucide-react";
export function Header() {
  return (
    <header className="border-b border-border bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="rounded-xl bg-secondary p-2 text-primary">
            <Sprout size={24} />
          </span>
          <span className="text-xl font-semibold tracking-tight">
            близкие<span className="text-primary">.</span>
          </span>
        </Link>
        <span className="hidden text-sm text-stone-500 sm:block">
          Личная CRM · Люди, которых вы знаете
        </span>
      </div>
    </header>
  );
}
