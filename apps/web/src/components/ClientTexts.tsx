import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import type { ReactNode } from "react";
import { pickMessages } from "@/lib/client-messages";

/**
 * The texts the client components of one page need (src/lib/client-messages.ts), given to them
 * where they are used: the layout gives only the texts every page shares.
 */
export async function ClientTexts({ namespaces, children }: { namespaces: readonly string[]; children: ReactNode }) {
  return <NextIntlClientProvider messages={pickMessages(await getMessages(), namespaces)}>{children}</NextIntlClientProvider>;
}
