import type { ReactNode } from "react";
import { TodoText } from "@/components/site/TodoText";
import { CourtMark } from "./CourtMark";

type Props = {
  /** What to upload here, with the missing-content marker; empty = no note. */
  note?: string;
  variant?: "plan" | "perspective";
  className?: string;
  children?: ReactNode;
};

/**
 * The place of a photo or video that has not been uploaded yet: a court drawn in lines on the
 * club's colours and a visible note saying what belongs here. No stock or generated imagery
 * stands in for the club's own.
 */
export function MediaFrame({ note, variant = "perspective", className, children }: Props) {
  return (
    <div className={`media-frame ${className ?? ""}`}>
      <CourtMark variant={variant} className="media-frame-court" />
      {children}
      {note ? (
        <p className="media-frame-note">
          <TodoText value={note} />
        </p>
      ) : null}
    </div>
  );
}
