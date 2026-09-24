import { Fragment } from "react";
import { TODO_MARK } from "@/lib/i18n-content";

/** Renders text, highlighting every [DE COMPLETAT] marker so missing content is obvious. */
export function TodoText({ value }: { value: string }) {
  if (!value.includes(TODO_MARK)) return <>{value}</>;
  const parts = value.split(TODO_MARK);
  return (
    <>
      {parts.map((part, index) => (
        <Fragment key={index}>
          {part}
          {index < parts.length - 1 ? <mark className="todo-mark">{TODO_MARK}</mark> : null}
        </Fragment>
      ))}
    </>
  );
}
