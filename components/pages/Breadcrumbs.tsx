import { Link } from "@/i18n/navigation";
import type { StaticPathname } from "@/components/home/links";

type Crumb = { label: string; href?: StaticPathname };

export function Breadcrumbs({ items, label }: { items: Crumb[]; label: string }) {
  return (
    <nav aria-label={label} className="breadcrumbs">
      <ol>
        {items.map((item, index) => (
          <li key={item.label}>
            {item.href && index < items.length - 1 ? (
              <Link href={item.href}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
