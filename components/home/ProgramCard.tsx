import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { ProgramView } from "@/lib/content";
import { formatPrice } from "@/lib/format";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { TodoText } from "@/components/site/TodoText";
import { programMeta } from "./programMeta";

/** A programme as a card: photo (or a court drawn on clay), name, key facts, price. */
export async function ProgramCard({ program, locale }: { program: ProgramView; locale: string }) {
  const t = await getTranslations();
  return (
    <li className="program-card">
      <Link
        href={{ pathname: "/programe/[slug]", params: { slug: program.slug } }}
        className="program-card-link"
      >
        <span className="program-card-media">
          {program.image ? (
            <Picture
              image={program.image}
              alt=""
              sizes="(min-width: 1024px) 24vw, (min-width: 640px) 45vw, 90vw"
              imgClassName="program-card-img"
            />
          ) : (
            <CourtMark className="program-card-court" />
          )}
        </span>
        <span className="program-card-body">
          <span className="program-card-meta">{programMeta(program, t).join(" · ")}</span>
          <span className="program-card-name">{program.name}</span>
          <span className="program-card-summary">
            <TodoText value={program.summary} />
          </span>
          <span className="program-card-foot">
            <span className="numerals">
              {program.priceFrom ? (
                <>
                  {t("common.from")}{" "}
                  <TodoText
                    value={formatPrice(program.priceFrom.price, program.priceFrom.currency, locale)}
                  />
                </>
              ) : null}
            </span>
            <span className="program-card-more" aria-hidden="true">
              {t("home.viewProgram")}
            </span>
          </span>
        </span>
      </Link>
    </li>
  );
}
