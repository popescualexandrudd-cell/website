/** The on-screen keyboard for searching names (§8.2), from `@jungle/kiosk-kit`. */
import { Keyboard as TouchKeyboard } from "@jungle/kiosk-kit";
import { useT } from "../kiosk";

export function Keyboard({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const t = useT();
  return (
    <TouchKeyboard
      value={value}
      onChange={onChange}
      labels={{ name: t("standings.search"), space: t("standings.space"), clear: t("standings.clear") }}
    />
  );
}
