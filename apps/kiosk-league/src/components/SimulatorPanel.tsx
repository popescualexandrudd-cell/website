/** Development and demos only (the bridge reports `simulator: true` only when
 * BRIDGE_SIMULATOR_CONTROL=1, never at the club): type a card code and "scan" it. */
import { useState } from "react";
import type { BridgeLink } from "../lib/bridge";

export function SimulatorPanel({ link }: { link: BridgeLink }) {
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
    </form>
  );
}
