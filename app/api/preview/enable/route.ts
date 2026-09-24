import { draftMode } from "next/headers";
import { redirect } from "next/navigation";
import { adminFromRequest } from "@/lib/auth";

/** Admin-only: shows the site with drafts and inactive items, until "Leave preview". */
export async function GET(request: Request) {
  if (!(await adminFromRequest())) redirect("/admin/login");
  (await draftMode()).enable();
  const target = new URL(request.url).searchParams.get("redirect") ?? "/";
  redirect(target.startsWith("/") && !target.startsWith("//") ? target : "/");
}
