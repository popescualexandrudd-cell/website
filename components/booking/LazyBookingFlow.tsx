"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState, type ComponentProps } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

const BookingFlow = dynamic(() => import("./BookingFlow").then((m) => m.BookingFlow), {
  ssr: false,
  loading: () => <WidgetPlaceholder />,
});

function WidgetPlaceholder() {
  const t = useTranslations("booking");
  return (
    <p role="status" className="booking-widget-placeholder">
      {t("widgetLoading")}
    </p>
  );
}

/**
 * The booking widget at the end of the home page: its code loads only when the visitor scrolls
 * near it, so it does not weigh on the first screen. Without JavaScript, a link leads to /rezervare.
 */
export function LazyBookingFlow(props: ComponentProps<typeof BookingFlow>) {
  const t = useTranslations("booking");
  const ref = useRef<HTMLDivElement>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          observer.disconnect();
        }
      },
      { rootMargin: "1500px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="booking-widget-lazy">
      {near ? (
        <BookingFlow {...props} />
      ) : (
        <p className="booking-widget-placeholder">
          <Link href="/rezervare" className="btn btn-primary">
            {t("widgetFallback")}
          </Link>
        </p>
      )}
    </div>
  );
}
