import "../globals.css";
import "./admin.css";
import type { Metadata, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";
import { fontVariables } from "../fonts";
import messages from "@/messages/ro.json";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "Administrare", template: "%s · Administrare" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: "#F6EFE6", width: "device-width", initialScale: 1 };

/** The admin is Romanian only; it shares the form components (and their messages) with the site. */
export default function AdminRootLayout({ children }: LayoutProps<"/admin">) {
  return (
    <html lang="ro" className={fontVariables}>
      <body className="admin-body">
        <NextIntlClientProvider locale="ro" messages={messages} timeZone="Europe/Bucharest">
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
