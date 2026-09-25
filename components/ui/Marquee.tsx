/**
 * A slow ribbon of names (organisers, programmes) that runs across the page. The list is read
 * once by screen readers; the moving copy is decorative and stops with reduced motion.
 */
export function Marquee({ items, label }: { items: string[]; label: string }) {
  if (items.length === 0) return null;
  // Enough copies to fill a wide screen, twice, so the loop has no seam.
  const copies = Math.max(2, Math.ceil(8 / items.length)) * 2;
  const run = Array.from({ length: copies }, () => items).flat();
  return (
    <div className="marquee">
      <ul className="sr-only" aria-label={label}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
      <div className="marquee-track" aria-hidden="true">
        {run.map((item, i) => (
          <span key={i} className="marquee-item">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
