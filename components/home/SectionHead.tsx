import type { ReactNode } from "react";
import { TodoText } from "@/components/site/TodoText";

type Props = {
  id: string;
  kicker: string;
  title: string;
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
};

/** The label in clay capitals, then the section title in condensed capitals. */
export function SectionHead({ id, kicker, title, as = "h2", className = "", children }: Props) {
  const Tag = as;
  return (
    <div className={`section-head ${className}`}>
      {kicker ? (
        <p className="kicker">
          <TodoText value={kicker} />
        </p>
      ) : null}
      <Tag id={id} className="home-title">
        <TodoText value={title} />
      </Tag>
      {children}
    </div>
  );
}
