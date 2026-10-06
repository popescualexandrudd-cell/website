import { notFound } from "next/navigation";

/** Any address the site does not have: the useful 404 of the page's language (§15.1). */
export default function UnknownPage() {
  notFound();
}
