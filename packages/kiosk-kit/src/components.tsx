/**
 * Touch controls the kiosks share: the on-screen keyboard (the kiosks have no physical keyboard;
 * Romanian letters included), the number pad (PIN, amounts) and the simulator panel, shown
 * only when the bridge reports simulator control (development and demos, never at the club).
 */
import { useState } from "react";
import type { BridgeLink } from "./bridge";

const ROWS = ["QWERTYUIOP", "ASDFGHJKLĂ", "ZXCVBNMÂÎȘȚ"];
const DIGITS = ["1234567890"];

export type KeyboardLabels = { name: string; space: string; clear: string };

export function Keyboard({
  value,
  onChange,
  labels,
  digits = false,
  upper = false,
}: {
  value: string;
  onChange: (next: string) => void;
  labels: KeyboardLabels;
  /** A row of digits too (voucher codes). */
  digits?: boolean;
  /** Keep capitals (codes) instead of lower case (names). */
  upper?: boolean;
}) {
  const rows = digits ? [...DIGITS, ...ROWS] : ROWS;
  return (
    <div className="keyboard" role="group" aria-label={labels.name}>
      {rows.map((row) => (
        <div key={row} className="keyboard__row">
          {[...row].map((key) => (
            <button
              key={key}
              type="button"
              className="key"
              onClick={() => onChange(value + (upper ? key : key.toLowerCase()))}
            >
              {key}
            </button>
          ))}
        </div>
      ))}
      <div className="keyboard__row">
        {upper ? null : (
          <button type="button" className="key key--wide" onClick={() => onChange(`${value} `)}>
            {labels.space}
          </button>
        )}
        <button type="button" className="key key--wide" onClick={() => onChange(value.slice(0, -1))} aria-label="⌫">
          ⌫
        </button>
        <button type="button" className="key key--wide" onClick={() => onChange("")}>
          {labels.clear}
        </button>
      </div>
    </div>
  );
}

/** Digits only; a PIN is shown as dots. */
export function NumPad({
  value,
  onChange,
  label,
  clear,
  max = 6,
  secret = false,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
  clear: string;
  max?: number;
  secret?: boolean;
}) {
  const press = (digit: string) => {
    if (value.length < max) onChange(value + digit);
  };
  return (
    <div className="numpad" role="group" aria-label={label}>
      <output className="numpad__value" aria-live="polite" aria-label={label}>
        {secret ? "•".repeat(value.length) : value}
        <span className="numpad__caret" aria-hidden="true">
          {value.length < max ? "_" : ""}
        </span>
      </output>
      <div className="numpad__keys">
        {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
          <button key={d} type="button" className="key key--num" onClick={() => press(d)}>
            {d}
          </button>
        ))}
        <button type="button" className="key key--num" onClick={() => onChange("")}>
          {clear}
        </button>
        <button type="button" className="key key--num" onClick={() => press("0")}>
          0
        </button>
        <button type="button" className="key key--num" onClick={() => onChange(value.slice(0, -1))} aria-label="⌫">
          ⌫
        </button>
      </div>
    </div>
  );
}

/** Development and demos only: scan a card code, push a note, cause a fault. */
export function SimulatorPanel({
  link,
  notes = [],
  faults = [],
}: {
  link: BridgeLink;
  /** Note values in bani (the Payments Kiosk). */
  notes?: number[];
  faults?: { device: "cash" | "fiscal" | "receipt"; fault: string }[];
}) {
  const [code, setCode] = useState("");
  return (
    <form
      className="simulator"
      aria-label="Simulator"
      onSubmit={(event) => {
        event.preventDefault();
        if (code.trim()) void link.simulateScan(code.trim());
        setCode("");
      }}
    >
      <span className="simulator__label">SIMULATOR</span>
      <input aria-label="Card code" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
      <button type="submit" className="button button--quiet">
        Scan
      </button>
      {notes.map((value) => (
        <button
          key={value}
          type="button"
          className="button button--quiet"
          aria-label={`Insert ${value / 100} lei`}
          onClick={() => void link.simulateNote(value)}
        >
          +{value / 100}
        </button>
      ))}
      {faults.map(({ device, fault }) => (
        <button
          key={`${device}:${fault}`}
          type="button"
          className="button button--quiet"
          onClick={() => void link.simulateFault(device, fault)}
        >
          {fault}
        </button>
      ))}
    </form>
  );
}
