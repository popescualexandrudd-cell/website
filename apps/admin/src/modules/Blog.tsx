/**
 * The club's blog (§9.3 `/blog`, §15.2): articles written here in Romanian and English, each with its
 * own address. Saved as a draft or published at once; corrected, published or withdrawn with a
 * reason; a draft never published can be deleted. Once published, an article keeps its address
 * (links and search engines). The text is Markdown: headings (##), lists (-), links, **bold**.
 */
import { type FormEvent, useState } from "react";
import { type Schemas, unwrap } from "../api";
import { formatDate } from "../i18n";
import { usePanel, useT } from "../panel";
import { ReasonAction, useData } from "../ui";

type Article = Schemas["StaffArticleOut"];
type Form = Pick<Article, "slug" | "title_ro" | "title_en" | "summary_ro" | "summary_en" | "body_ro" | "body_en">;

const empty = (): Form => ({ slug: "", title_ro: "", title_en: "", summary_ro: "", summary_en: "", body_ro: "", body_en: "" });

/** An address from a title: lowercase, no diacritics, words joined by dashes. */
export function slugOf(title: string): string {
  return title
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/, "");
}

export function Blog() {
  const { api, locationId, lang, notify } = usePanel();
  const t = useT();
  const { data, reload } = useData(() => unwrap(api.client.GET("/api/v1/staff/blog", { params: { query: { location_id: locationId } } })), [api, locationId]);
  const [editing, setEditing] = useState<Article | null>(null);
  const publish = async (a: Article, published: boolean, reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/blog/{article_id}/publication", { params: { path: { article_id: a.id } }, body: { published, reason } }));
    notify(t(published ? "blog.published" : "blog.withdrawn"));
    await reload();
  };
  const remove = async (a: Article, reason: string) => {
    await unwrap(api.client.POST("/api/v1/staff/blog/{article_id}/delete", { params: { path: { article_id: a.id } }, body: { reason } }));
    notify(t("blog.deleted"));
    await reload();
  };
  return (
    <section aria-labelledby="blog-title">
      <h1 id="blog-title">{t("blog.title")}</h1>
      <p className="muted">{t("blog.lead")}</p>
      <ArticleForm
        key={editing?.id ?? "new"}
        article={editing}
        onDone={async () => {
          setEditing(null);
          await reload();
        }}
        onClose={() => setEditing(null)}
      />
      {data && data.length === 0 ? <p>{t("blog.none")}</p> : null}
      {data && data.length > 0 ? (
        <table className="table">
          <thead>
            <tr>
              <th scope="col">{t("blog.article")}</th>
              <th scope="col">{t("blog.state")}</th>
              <th scope="col">{t("blog.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {data.map((a) => (
              <tr key={a.id}>
                <th scope="row">
                  {a.title_ro}
                  <span className="muted">
                    {" · /blog/"}
                    {a.slug}
                    {a.is_demo ? ` · ${t("blog.demo")}` : ""}
                  </span>
                </th>
                <td>
                  {t(a.published ? "blog.states.published" : a.first_published_at ? "blog.states.withdrawn" : "blog.states.draft")}
                  {a.first_published_at ? <span className="muted"> · {formatDate(lang, a.first_published_at)}</span> : null}
                </td>
                <td>
                  <div className="actions">
                    <button type="button" className="button" onClick={() => setEditing(a)}>
                      {t("blog.edit")}
                    </button>
                    <ReasonAction label={t(a.published ? "blog.withdraw" : "blog.publish")} onConfirm={(reason) => publish(a, !a.published, reason)} />
                    {a.first_published_at ? null : <ReasonAction label={t("blog.delete")} danger onConfirm={(reason) => remove(a, reason)} />}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </section>
  );
}

function ArticleForm({ article, onDone, onClose }: { article: Article | null; onDone: () => Promise<void>; onClose: () => void }) {
  const { api, locationId, notify, fail } = usePanel();
  const t = useT();
  const [form, setForm] = useState<Form>(article ? { ...article } : empty());
  const [slugTouched, setSlugTouched] = useState(Boolean(article));
  const [publishNow, setPublishNow] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const label = t(article ? "blog.editTitle" : "blog.add");
  // A published article keeps its address (the server refuses a change).
  const slugLocked = Boolean(article?.first_published_at);
  const field = (key: keyof Form) => ({
    value: form[key],
    onChange: (e: { target: { value: string } }) =>
      setForm((f) => ({ ...f, [key]: e.target.value, ...(key === "title_ro" && !slugTouched ? { slug: slugOf(e.target.value) } : {}) })),
  });
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const body = { ...form };
    try {
      if (article) {
        await unwrap(api.client.PUT("/api/v1/staff/blog/{article_id}", { params: { path: { article_id: article.id } }, body: { ...body, reason: reason.trim() } }));
        notify(t("blog.saved"));
      } else {
        await unwrap(api.client.POST("/api/v1/staff/blog", { body: { ...body, location_id: locationId, published: publishNow } }));
        notify(t("blog.created"));
        setForm(empty());
        setSlugTouched(false);
        setPublishNow(false);
      }
      await onDone();
    } catch (error) {
      fail(error);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="panel-box form" onSubmit={(e) => void submit(e)} aria-label={label}>
      <h3>{label}</h3>
      <label>
        {t("blog.titleRo")}
        <input required maxLength={140} {...field("title_ro")} />
      </label>
      <label>
        {t("blog.titleEn")}
        <input required maxLength={140} {...field("title_en")} />
      </label>
      <label>
        {t("blog.slug")}
        <input
          required
          maxLength={80}
          pattern="[a-z0-9]+(-[a-z0-9]+)*"
          readOnly={slugLocked}
          aria-describedby="blog-slug-hint"
          value={form.slug}
          onChange={(e) => {
            setSlugTouched(true);
            setForm((f) => ({ ...f, slug: e.target.value }));
          }}
        />
      </label>
      <p id="blog-slug-hint" className="muted">
        {t(slugLocked ? "blog.slugLocked" : "blog.slugHint")}
      </p>
      <label>
        {t("blog.summaryRo")}
        <textarea required maxLength={300} {...field("summary_ro")} />
      </label>
      <label>
        {t("blog.summaryEn")}
        <textarea required maxLength={300} {...field("summary_en")} />
      </label>
      <label>
        {t("blog.bodyRo")}
        <textarea required rows={12} maxLength={40000} {...field("body_ro")} />
      </label>
      <label>
        {t("blog.bodyEn")}
        <textarea required rows={12} maxLength={40000} {...field("body_en")} />
      </label>
      <p className="muted">{t("blog.markdown")}</p>
      {article ? (
        <label>
          {t("reason")}
          <input required minLength={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} />
        </label>
      ) : (
        <label className="check">
          <input type="checkbox" checked={publishNow} onChange={(e) => setPublishNow(e.target.checked)} />
          {t("blog.publishNow")}
        </label>
      )}
      <div className="actions">
        <button type="submit" className="button button--primary" disabled={busy}>
          {t(article ? "blog.save" : "blog.create")}
        </button>
        {article ? (
          <button type="button" className="button button--quiet" onClick={onClose}>
            {t("cancel")}
          </button>
        ) : null}
      </div>
    </form>
  );
}
