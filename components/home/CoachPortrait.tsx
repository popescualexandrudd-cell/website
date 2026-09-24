import type { ResolvedImage } from "@/lib/media-shared";
import { Picture } from "@/components/ui/Picture";
import { CourtMark } from "@/components/ui/CourtMark";
import { TodoText } from "@/components/site/TodoText";

type Props = {
  photo: ResolvedImage | null;
  alt: string;
  /** Shown inside the frame until the photo is uploaded. */
  note: string;
  priority?: boolean;
};

/**
 * The coach's photo on court, in a portrait frame offset over a clay block. Until the photo
 * is uploaded (Conținut → Profilul antrenorului → Fotografia ta), the frame keeps its place
 * with a court drawn in lines and a visible note.
 */
export function CoachPortrait({ photo, alt, note, priority = false }: Props) {
  return (
    <figure className="coach-portrait">
      <div className="coach-portrait-frame">
        {photo ? (
          <Picture
            image={photo}
            alt={alt}
            priority={priority}
            sizes="(min-width: 1024px) 34vw, 92vw"
            className="coach-portrait-picture"
            imgClassName="coach-portrait-img"
          />
        ) : (
          <div className="coach-portrait-empty">
            <CourtMark variant="plan" className="coach-portrait-court" />
            <span className="coach-portrait-ball" aria-hidden="true" />
            {note ? (
              <p className="coach-portrait-note">
                <TodoText value={note} />
              </p>
            ) : null}
          </div>
        )}
      </div>
    </figure>
  );
}
