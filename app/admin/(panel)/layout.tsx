import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { AdminNav } from "@/components/admin/AdminNav";

export default async function PanelLayout({ children }: LayoutProps<"/admin">) {
  const { user } = await requireAdmin();
  const isOwner = user.role === "PROPRIETAR";
  const [pending, messages, waitlist, giftCards, players] = isOwner
    ? await Promise.all([
        db.booking.count({ where: { status: "IN_ASTEPTARE", startsAt: { gte: new Date() } } }),
        db.contactMessage.count({ where: { status: "NOU" } }),
        db.waitlistEntry.count({ where: { status: "NOU" } }),
        db.giftCard.count({ where: { status: "CERERE" } }),
        db.amateurPlayer.count({ where: { approved: false } }),
      ])
    : [0, 0, 0, 0, 0];
  return (
    <div className="admin-shell">
      <a href="#admin-main" className="skip-link">
        Sari la conținut
      </a>
      <AdminNav
        isOwner={isOwner}
        userName={user.name}
        badges={{
          "/admin/rezervari": pending,
          "/admin/mesaje": messages,
          "/admin/lista-asteptare": waitlist,
          "/admin/continut/carduri-cadou": giftCards,
          "/admin/continut/jucatori": players,
        }}
      />
      <main id="admin-main" className="admin-main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
