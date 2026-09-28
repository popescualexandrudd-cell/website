/** An on-screen keyboard: the kiosk has no physical keyboard (§8.2). Romanian letters
 * included, for searching names. */
import { useT } from "../kiosk";

const ROWS = ["QWERTYUIOP", "ASDFGHJKLĂ", "ZXCVBNMÂÎȘȚ"];

export function Keyboard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const t = useT();
  return (
    <div className="keyboard" aria-label={t("standings.search")}>
      {ROWS.map((row) => (
        <div key={row} className="keyboard__row">
          {[...row].map((key) => (
            <button key={key} type="button" className="key" onClick={() => onChange(value + key.toLowerCase())}>
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard__row">
        <button type="button" className="key key--wide" onClick={() => onChange(`${value} `)}>
          {t("standings.space")}
        </button>
        <button type="button" className="key key--wide" onClick={() => onChange(value.slice(0, -1))} aria-label="⌫">
          ⌫
        </button>
        <button type="button" className="key key--wide" onClick={() => onChange("")}>
          {t("standings.clear")}
        </button>
      </div>
    </div>
  );
}
