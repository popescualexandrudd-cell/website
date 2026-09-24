"use client";

import { useEffect, useState } from "react";
import { usePathname } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";

type Props = { bookLabel: string; whatsappLabel: string; whatsappUrl: string | null; callLabel: string; telUrl: string | null };

/**
 * Fixed bar under 768 px with the two actions people need on the phone. On the home page it
 * appears once the first scene has scrolled away; on the booking pages it stays hidden.
 */
export function MobileBar({ bookLabel, whatsappLabel, whatsappUrl, callLabel, telUrl }: Props) {
  const pathname = usePathname();
  const isHome = pathname === "/";
  const onBooking = pathname.startsWith("/rezervare");
  const [pastFirstScene, setPastFirstScene] = useState(false);
  const visible = isHome ? pastFirstScene : true;

  useEffect(() => {
    if (!isHome) return;
    const first = document.querySelector("[data-scene]");
    if (!first) return;
    const observer = new IntersectionObserver(([entry]) => setPastFirstScene(entry ? !entry.isIntersecting : true), {
      threshold: 0.15,
    });
    observer.observe(first);
    return () => observer.disconnect();
  }, [isHome]);

  if (onBooking) return null;
  const secondary = whatsappUrl
    ? { href: whatsappUrl, label: whatsappLabel, external: true }
    : telUrl
      ? { href: telUrl, label: callLabel, external: false }
      : null;
  return (
    <div className="mobile-bar" data-visible={visible} aria-hidden={!visible}>
      <Link href="/rezervare" className="mobile-bar-primary" tabIndex={visible ? 0 : -1}>
        {bookLabel}
      </Link>
      {secondary ? (
        <a
          href={secondary.href}
          className="mobile-bar-secondary"
          tabIndex={visible ? 0 : -1}
          {...(secondary.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
        >
          {secondary.label}
        </a>
      ) : null}
    </div>
  );
}
