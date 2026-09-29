import { setRequestLocale } from "next-intl/server";
import { Upcoming, upcomingMetadata } from "@/components/Upcoming";

export const revalidate = 300;

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  return upcomingMetadata(locale, "packages");
}

export default async function Page({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  setRequestLocale(locale);
  return <Upcoming page="packages" />;
}
