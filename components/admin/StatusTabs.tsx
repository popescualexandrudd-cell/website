import Link from "next/link";

/** Filter tabs rendered as links (work without JavaScript, keep the filter in the URL). */
export function StatusTabs({
  base,
  current,
  tabs,
}: {
  base: string;
  current: string;
  tabs: { value: string; label: string; count?: number }[];
}) {
  return (
    <nav aria-label="Filtru" className="mb-4 flex flex-wrap gap-2">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.value ? `${base}?stare=${tab.value}` : base}
          aria-current={current === tab.value ? "page" : undefined}
          className={`btn btn-small ${current === tab.value ? "btn-primary" : "btn-secondary"}`}
        >
          {tab.label}
          {tab.count !== undefined ? ` (${tab.count})` : ""}
        </Link>
      ))}
    </nav>
  );
}
