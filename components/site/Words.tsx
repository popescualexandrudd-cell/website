import { Fragment, type CSSProperties } from "react";
import { TODO_MARK } from "@/lib/i18n-content";
import { TodoText } from "./TodoText";

/**
 * A title whose words light up one after another, in reading order, as it scrolls into view
 * (driven by ScrollEffects). Without JavaScript, or with reduced motion, it is plain text.
 * Texts that still carry the missing-content marker are left whole, so the marker stays visible.
 */
export function Words({ text }: { text: string }) {
  if (text.includes(TODO_MARK)) return <TodoText value={text} />;
  const words = text.split(/\s+/).filter(Boolean);
  return (
    <span className="fx-words" style={{ "--fx-n": words.length } as CSSProperties}>
      {words.map((word, i) => (
        <Fragment key={i}>
          {i > 0 ? " " : null}
          <span className="fx-word" style={{ "--fx-i": i } as CSSProperties}>
            {word}
          </span>
        </Fragment>
      ))}
    </span>
  );
}
