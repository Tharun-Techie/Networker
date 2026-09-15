"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const path = usePathname();
  const active = (href: string, exact = false) =>
    (exact ? path === href : path.startsWith(href)) ? "active" : "";
  return (
    <nav className="nw-nav">
      <div className="nw-brand">
        <span className="nw-brand-mark">N</span>
        Networker
      </div>
      <div className="nw-links">
        <Link href="/" className={active("/", true)}>
          Explore
        </Link>
        <Link href="/search" className={active("/search")}>
          Search / Query
        </Link>
        <Link href="/add" className={active("/add")}>
          + Add
        </Link>
      </div>
    </nav>
  );
}
