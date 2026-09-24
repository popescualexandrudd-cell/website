import { notFound } from "next/navigation";

/** Any unknown path inside the site renders the styled 404 within the public layout. */
export default function CatchAll() {
  notFound();
}
