/**
 * The small part of Markdown the assistant may write: paragraphs, "- " lists, **bold** and links.
 * Parsed into plain data so the widget renders it with React (no HTML from the model).
 */

export type Inline =
  | { kind: "text"; text: string }
  | { kind: "bold"; text: string }
  | { kind: "link"; text: string; href: string; internal: boolean };

export type Block = { kind: "p"; lines: Inline[][] } | { kind: "ul"; items: Inline[][] };

const INLINE = /\*\*([^*\n]+)\*\*|\[([^\]\n]+)\]\(([^)\s]+)\)/g;
const LIST_ITEM = /^\s*(?:[-*•]|\d+[.)])\s+/;

/** Site paths, phone and email links, and https pages; anything else stays plain text. */
export function safeLink(href: string): { href: string; internal: boolean } | null {
  if (href.startsWith("/") && !href.startsWith("//")) return { href, internal: true };
  if (/^(tel:\+?[\d\s-]+|mailto:[^\s@]+@[^\s@]+)$/i.test(href)) return { href, internal: false };
  try {
    const url = new URL(href);
    return url.protocol === "https:" ? { href: url.toString(), internal: false } : null;
  } catch {
    return null;
  }
}

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const index = match.index ?? 0;
    if (index > last) out.push({ kind: "text", text: text.slice(last, index) });
    if (match[1] !== undefined) {
      out.push({ kind: "bold", text: match[1] });
    } else if (match[2] !== undefined && match[3] !== undefined) {
      const link = safeLink(match[3]);
      out.push(link ? { kind: "link", text: match[2], ...link } : { kind: "text", text: match[2] });
    }
    last = index + match[0].length;
  }
  if (last < text.length) out.push({ kind: "text", text: text.slice(last) });
  return out;
}

export function parseAnswer(text: string): Block[] {
  const blocks: Block[] = [];
  for (const chunk of text.split(/\n\s*\n/)) {
    // Within a chunk, consecutive plain lines form one paragraph with line breaks.
    let paragraph: Extract<Block, { kind: "p" }> | null = null;
    for (const line of chunk.split("\n")) {
      if (!line.trim()) continue;
      const last = blocks.at(-1);
      if (LIST_ITEM.test(line)) {
        paragraph = null;
        const item = parseInline(line.replace(LIST_ITEM, "").trim());
        if (last?.kind === "ul") last.items.push(item);
        else blocks.push({ kind: "ul", items: [item] });
      } else if (paragraph) {
        paragraph.lines.push(parseInline(line.trim()));
      } else {
        paragraph = { kind: "p", lines: [parseInline(line.trim())] };
        blocks.push(paragraph);
      }
    }
  }
  return blocks;
}
