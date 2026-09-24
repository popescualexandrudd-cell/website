"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/admin-auth";

type Item = { href: string; label: string; badge?: number; ownerOnly?: boolean };

const ITEMS: Item[] = [
  { href: "/admin", label: "Tablou de bord" },
  { href: "/admin/azi", label: "Azi", ownerOnly: true },
  { href: "/admin/rezervari", label: "Rezervări", ownerOnly: true },
  { href: "/admin/disponibilitate", label: "Disponibilitate", ownerOnly: true },
  { href: "/admin/continut", label: "Conținut" },
  { href: "/admin/media", label: "Media" },
  { href: "/admin/mesaje", label: "Mesaje", ownerOnly: true },
  { href: "/admin/lista-asteptare", label: "Listă de așteptare", ownerOnly: true },
  { href: "/admin/clienti", label: "Clienți", ownerOnly: true },
  { href: "/admin/newsletter", label: "Newsletter", ownerOnly: true },
  { href: "/admin/setari", label: "Setări", ownerOnly: true },
  { href: "/admin/jurnal", label: "Jurnal", ownerOnly: true },
  { href: "/admin/cont", label: "Contul meu" },
];

function isActive(pathname: string, href: string) {
  return href === "/admin"
    ? pathname === "/admin"
    : pathname === href || pathname.startsWith(`${href}/`);
}

export function AdminNav({
  isOwner,
  userName,
  badges,
}: {
  isOwner: boolean;
  userName: string;
  badges: Record<string, number>;
}) {
  const pathname = usePathname();
  // The drawer belongs to the page it was opened on, so navigating closes it without an effect.
  const [openOn, setOpenOn] = useState<string | null>(null);
  const open = openOn === pathname;
  const items = ITEMS.filter((item) => isOwner || !item.ownerOnly).map((item) => ({
    ...item,
    badge: badges[item.href],
  }));
  const quick = isOwner
    ? items.filter((i) => ["/admin/azi", "/admin/rezervari", "/admin/mesaje"].includes(i.href))
    : items.filter((i) => ["/admin", "/admin/continut", "/admin/media"].includes(i.href));

  const list = (
    <ul className="admin-nav-list">
      {items.map((item) => (
        <li key={item.href}>
          <Link href={item.href} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
            <span>{item.label}</span>
            {item.badge ? <span className="admin-badge">{item.badge}</span> : null}
          </Link>
        </li>
      ))}
    </ul>
  );

  return (
    <>
      <aside className="admin-sidebar" aria-label="Meniu administrare">
        <p className="admin-sidebar-user">{userName}</p>
        <nav aria-label="Secțiuni">{list}</nav>
        <div className="admin-sidebar-foot">
          <a href="/" target="_blank" rel="noopener">
            Vezi site-ul
          </a>
          <form action={logoutAction}>
            <button type="submit">Ieșire</button>
          </form>
        </div>
      </aside>

      <nav className="admin-tabbar" aria-label="Acces rapid">
        {quick.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive(pathname, item.href) ? "page" : undefined}
          >
            {item.label}
            {item.badge ? <span className="admin-badge">{item.badge}</span> : null}
          </Link>
        ))}
        <button
          type="button"
          aria-expanded={open}
          aria-controls="admin-drawer"
          onClick={() => setOpenOn(open ? null : pathname)}
        >
          {open ? "Închide" : "Meniu"}
        </button>
      </nav>
      {open ? (
        <div id="admin-drawer" className="admin-drawer">
          <nav aria-label="Toate secțiunile">{list}</nav>
          <div className="admin-sidebar-foot">
            <a href="/" target="_blank" rel="noopener">
              Vezi site-ul
            </a>
            <form action={logoutAction}>
              <button type="submit">Ieșire</button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
