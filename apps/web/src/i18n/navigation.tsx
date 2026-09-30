import type { ComponentProps } from "react";
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

const navigation = createNavigation(routing);

export const { redirect, usePathname, useRouter, getPathname } = navigation;

/**
 * The site's links, without prefetching: a page is fetched when it is opened. Prefetching every
 * link on the home page as it scrolled into view (the logo alone brought the whole home page
 * again, ~94 KB of page data) kept a phone's processor busy while the page was starting, and the
 * mobile Lighthouse score fell under 90 (§9.4). A link may still ask for it with `prefetch`.
 */
export function Link({ prefetch = false, ...props }: ComponentProps<typeof navigation.Link>) {
  return <navigation.Link prefetch={prefetch} {...props} />;
}
