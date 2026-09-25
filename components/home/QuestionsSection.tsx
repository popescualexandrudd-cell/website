import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FaqView, SceneView, TestimonialView } from "@/lib/content";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { GoogleRating } from "@/components/site/GoogleRating";
import type { GoogleReviews } from "@/lib/reviews";
import { SectionHead } from "./SectionHead";
import { safeHref } from "./links";

/**
 * Questions before the first lesson, as <details> accordions (keyboard, screen readers and no
 * JavaScript all work). Reviews appear only when real, consented ones are published; the club's
 * Google rating sits above them.
 */
export async function QuestionsSection({
  scene,
  faqs,
  testimonials,
  reviews,
}: {
  scene: SceneView;
  faqs: FaqView[];
  testimonials: TestimonialView[];
  reviews: GoogleReviews | null;
}) {
  const t = await getTranslations("home");
  const href = safeHref(scene.ctaHref) ?? "/intrebari";
  return (
    <section className="questions tone-sand" id={scene.key} aria-labelledby={`${scene.key}-title`}>
      <div className="questions-inner">
        <div className="questions-head">
          <SectionHead id={`${scene.key}-title`} kicker={scene.indexName} title={scene.title} />
          {scene.ctaLabel ? (
            <Link href={href} className="link-quiet">
              {scene.ctaLabel}
            </Link>
          ) : null}
        </div>
        <div className="faq-list">
          {faqs.map((faq) => (
            <details key={faq.id} className="faq-item">
              <summary className="faq-question">
                <span>
                  <TodoText value={faq.question} />
                </span>
                <span className="faq-icon" aria-hidden="true" />
              </summary>
              <div className="faq-answer">
                <Markdown source={faq.answer} />
              </div>
            </details>
          ))}
        </div>
      </div>
      {reviews ? (
        <div className="testimonials-rating">
          <GoogleRating reviews={reviews} />
        </div>
      ) : null}
      {testimonials.length > 0 ? (
        <section className="testimonials" aria-label={t("testimonialsLabel")}>
          {testimonials.map((item) => (
            <figure key={item.id} className="testimonial">
              <blockquote>
                <p>„{item.text}”</p>
              </blockquote>
              <figcaption>
                {item.author}
                {item.role ? <span className="text-cerneala-2">, {item.role}</span> : null}
              </figcaption>
            </figure>
          ))}
        </section>
      ) : null}
    </section>
  );
}
