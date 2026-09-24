import type { ReactNode } from "react";
import { TodoText } from "@/components/site/TodoText";

type Props = {
  id: string;
  text: string;
  as?: "h1" | "h2";
  className?: string;
  children?: ReactNode;
};

export function SceneTitle({ id, text, as = "h2", className = "", children }: Props) {
  const Tag = as;
  return (
    <Tag id={id} className={`scene-title ${className}`}>
      {children ?? <TodoText value={text} />}
    </Tag>
  );
}
