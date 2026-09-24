import MarkdownIt from "markdown-it";
import { TODO_MARK } from "./i18n-content";

/**
 * Markdown from the admin. Raw HTML is disabled, so content can never inject markup or scripts;
 * external links open safely and the [DE COMPLETAT] marker is highlighted.
 */
const md = new MarkdownIt({ html: false, linkify: true, typographer: false, breaks: false });

const defaultLinkOpen =
  md.renderer.rules.link_open ?? ((tokens, idx, options, _env, self) => self.renderToken(tokens, idx, options));

md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  const href = String(token?.attrGet("href") ?? "");
  if (token && /^https?:\/\//i.test(href)) {
    token.attrSet("rel", "noopener noreferrer");
    token.attrSet("target", "_blank");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

const TODO_HTML = `<mark class="todo-mark">${TODO_MARK}</mark>`;

export function renderMarkdown(source: string): string {
  return md.render(source).replaceAll(TODO_MARK, TODO_HTML);
}

export function renderInlineMarkdown(source: string): string {
  return md.renderInline(source).replaceAll(TODO_MARK, TODO_HTML);
}

/** Parses an ordered Markdown list ("1. **Title.** text") into items, for the method scene. */
export function orderedListItems(source: string): { title: string; text: string }[] {
  return source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^\d+\.\s/.test(line))
    .map((line) => {
      const content = line.replace(/^\d+\.\s+/, "");
      const bold = content.match(/^\*\*(.+?)\*\*\s*(.*)$/);
      if (bold) return { title: (bold[1] ?? "").replace(/\.$/, ""), text: bold[2] ?? "" };
      return { title: "", text: content };
    });
}
