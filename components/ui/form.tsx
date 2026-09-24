"use client";

import {
  useEffect,
  useId,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { FormState } from "@/lib/form-state";

type BaseProps = {
  name: string;
  label: string;
  hint?: string;
  error?: string;
  optional?: boolean;
  className?: string;
};

function useFieldIds(name: string) {
  const id = useId();
  return { inputId: `${name}-${id}`, hintId: `${name}-${id}-hint`, errorId: `${name}-${id}-error` };
}

function describedBy(hint: boolean, error: boolean, ids: { hintId: string; errorId: string }) {
  return (
    [hint ? ids.hintId : null, error ? ids.errorId : null].filter(Boolean).join(" ") || undefined
  );
}

function FieldShell({
  label,
  hint,
  error,
  ids,
  children,
  className,
  required,
}: {
  label: string;
  hint?: string;
  error?: string;
  ids: { inputId: string; hintId: string; errorId: string };
  children: ReactNode;
  className?: string;
  required?: boolean;
}) {
  const t = useTranslations("form");
  return (
    <div className={`field ${className ?? ""}`}>
      <label htmlFor={ids.inputId} className="field-label">
        {label}
        {required ? <span className="sr-only"> ({t("required")})</span> : null}
      </label>
      {hint ? (
        <p id={ids.hintId} className="field-hint">
          {hint}
        </p>
      ) : null}
      {children}
      {error ? (
        <p id={ids.errorId} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Translates a server error code into a sentence for the reader. */
export function useErrorText() {
  const t = useTranslations("form.errors");
  return (code?: string) => {
    if (!code) return undefined;
    return t.has(code) ? t(code) : t("server");
  };
}

export function TextField(props: BaseProps & InputHTMLAttributes<HTMLInputElement>) {
  const { name, label, hint, error, optional, className, ...rest } = props;
  const ids = useFieldIds(name);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      ids={ids}
      className={className}
      required={!optional}
    >
      <input
        id={ids.inputId}
        name={name}
        className="input"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(Boolean(hint), Boolean(error), ids)}
        {...rest}
      />
    </FieldShell>
  );
}

export function TextArea(props: BaseProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { name, label, hint, error, optional, className, ...rest } = props;
  const ids = useFieldIds(name);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      ids={ids}
      className={className}
      required={!optional}
    >
      <textarea
        id={ids.inputId}
        name={name}
        className="input"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(Boolean(hint), Boolean(error), ids)}
        {...rest}
      />
    </FieldShell>
  );
}

export function SelectField(
  props: BaseProps & SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode },
) {
  const { name, label, hint, error, optional, className, children, ...rest } = props;
  const ids = useFieldIds(name);
  return (
    <FieldShell
      label={label}
      hint={hint}
      error={error}
      ids={ids}
      className={className}
      required={!optional}
    >
      <select
        id={ids.inputId}
        name={name}
        className="input"
        required={!optional}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(Boolean(hint), Boolean(error), ids)}
        {...rest}
      >
        {children}
      </select>
    </FieldShell>
  );
}

/** Unticked by default; the privacy policy opens in the same tab so the form keeps its state on return. */
export function ConsentField({ error, label }: { error?: string; label?: ReactNode }) {
  const t = useTranslations("form");
  const id = useId();
  return (
    <div className="field">
      <div className="flex items-start gap-3">
        <input
          id={`consent-${id}`}
          name="consent"
          type="checkbox"
          required
          className="mt-1 size-5 shrink-0 accent-[var(--color-cerneala)]"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `consent-${id}-error` : undefined}
        />
        <label htmlFor={`consent-${id}`} className="text-[0.95rem] leading-snug">
          {label ??
            t.rich("consent", {
              privacy: (chunks) => (
                <Link href="/confidentialitate" className="link" target="_blank" rel="noopener">
                  {chunks}
                </Link>
              ),
            })}
        </label>
      </div>
      {error ? (
        <p id={`consent-${id}-error`} className="field-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/** Hidden from people (and assistive technology); bots tend to fill it. */
export function Honeypot() {
  const t = useTranslations("form");
  return (
    <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
      <label>
        {t("honeypot")}
        <input type="text" name="website" tabIndex={-1} autoComplete="off" defaultValue="" />
      </label>
    </div>
  );
}

declare global {
  interface Window {
    turnstile?: {
      render: (element: HTMLElement, options: Record<string, unknown>) => string;
      remove: (id: string) => void;
    };
  }
}

/** Cloudflare Turnstile, only when a site key is configured. */
export function Turnstile({ siteKey, nonce }: { siteKey?: string | null; nonce?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!siteKey || !ref.current) return;
    const element = ref.current;
    let widgetId: string | null = null;
    const mount = () => {
      if (window.turnstile && element && !widgetId)
        widgetId = window.turnstile.render(element, { sitekey: siteKey, theme: "light" });
    };
    if (window.turnstile) mount();
    else {
      const existing = document.querySelector<HTMLScriptElement>("script[data-turnstile]");
      const script = existing ?? document.createElement("script");
      if (!existing) {
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
        script.async = true;
        script.dataset.turnstile = "1";
        if (nonce) script.nonce = nonce;
        document.head.appendChild(script);
      }
      script.addEventListener("load", mount);
    }
    return () => {
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [siteKey, nonce]);
  if (!siteKey) return null;
  return <div ref={ref} className="min-h-[65px]" />;
}

export function SubmitButton({
  children,
  className = "btn btn-primary",
  pending: pendingProp,
}: {
  children: ReactNode;
  className?: string;
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingProp ?? status.pending;
  const t = useTranslations("common");
  return (
    <button type="submit" className={className} disabled={pending} aria-disabled={pending}>
      {pending ? t("loading") : children}
    </button>
  );
}

/** Announces the result of a submission to screen readers and moves focus to it on error. */
export function FormStatus({ state, success }: { state: FormState; success: ReactNode }) {
  const t = useTranslations("form");
  const errorText = useErrorText();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (state.status === "error") ref.current?.focus();
  }, [state]);
  if (state.status === "success") {
    return (
      <div role="status" className="border-l-2 border-succes py-1 pl-4 text-succes">
        {success}
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div
        ref={ref}
        tabIndex={-1}
        role="alert"
        className="border-l-2 border-eroare py-1 pl-4 text-eroare outline-none"
      >
        {state.error ? errorText(state.error) : t("errorSummary")}
      </div>
    );
  }
  return <div role="status" aria-live="polite" className="sr-only" />;
}
