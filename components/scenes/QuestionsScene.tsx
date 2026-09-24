import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { FaqView, SceneView, TestimonialView } from "@/lib/content";
import { Markdown } from "@/components/site/Markdown";
import { TodoText } from "@/components/site/TodoText";
import { SceneFrame } from "./SceneFrame";
import { SceneTitle } from "./SceneTitle";
import { safeHref } from "./links";

/**
 * Scene 9 · questions. The title is the only calligraphic italic on the site. The accordion is
 * built on <details>/<summary>, so it works with the keyboard, screen readers and without JS.
 * Reviews appear only if real, consented ones are published.
 */
export async function QuestionsScene({
  scene,
  index,
  faqs,
  testimonials,
}: {
  scene: SceneView;
  index: number;
  faqs: FaqView[];
  testimonials: TestimonialView[];
}) {
  const t = await getTranslations("home");
  const href = safeHref(scene.ctaHref) ?? "/intrebari";
  return (
    <SceneFrame scene={scene} index={index} layout="flow">
      <SceneTitle
        id={`${scene.key}-title`}
        text={scene.title}
        className="scene-title--calligraphic"
      />
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
      {scene.ctaLabel ? (
        <p className="mt-8">
          <Link href={href} className="link-quiet">
            {scene.ctaLabel}
          </Link>
        </p>
      ) : null}
    </SceneFrame>
  );
}
