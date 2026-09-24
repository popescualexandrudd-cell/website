import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { Locale } from "@/i18n/routing";
import { getPageHeader, getPrograms } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { pageMetadata } from "@/lib/seo";
import { PageHero, PageSection } from "@/components/pages/PageHero";
import { ArtPicture } from "@/components/ui/ArtPicture";
import { TodoText } from "@/components/site/TodoText";
import { GROUP_ORDER, programGroup, programMeta } from "@/components/scenes/programMeta";

export async function generateMetadata({ params }: PageProps<"/[locale]/programe">): Promise<Metadata> {
  const locale = (await params).locale as Locale;
  const header = await getPageHeader("programe", locale);
  return pageMetadata({ locale, href: "/programe", title: header.seoTitle, description: header.seoDescription });
}

export default async function ProgramsPage({ params }: PageProps<"/[locale]/programe">) {
  const locale = (await params).locale as Locale;
  setRequestLocale(locale);
  const [header, programs, t] = await Promise.all([getPageHeader("programe", locale), getPrograms(locale), getTranslations()]);
  const groups = GROUP_ORDER.map((key) => ({ key, items: programs.filter((p) => programGroup(p) === key) })).filter((g) => g.items.length > 0);

  return (
    <>
      <PageHero title={header.title} intro={header.intro} art={header.art} imageAlt={header.imageAlt} />
      {groups.map((group) => (
        <PageSection key={group.key} id={`grup-${group.key.toLowerCase()}`} title={t(`programs.groups.${group.key}`)}>
          <ul>
            {group.items.map((program) => (
              <li key={program.id} className="ed-row">
                <Link href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }} className="ed-row-image" tabIndex={-1} aria-hidden="true">
                  {program.art ? <ArtPicture art={program.art} alt="" desktopOnly sizes="9rem" /> : null}
                </Link>
                <div>
                  <h3 className="ed-row-title">
                    <Link href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}>{program.name}</Link>
                  </h3>
                  <p className="ed-row-meta">{programMeta(program, t).join(" · ")}</p>
                  <p className="ed-row-text">{program.summary}</p>
                </div>
                <p className="ed-row-aside numerals">
                  {program.priceFrom ? (
                    <>
                      {t("common.from")} <TodoText value={formatPrice(program.priceFrom.price, program.priceFrom.currency, locale)} />
                    </>
                  ) : null}
                </p>
              </li>
            ))}
          </ul>
        </PageSection>
      ))}
    </>
  );
}
