import { act, cleanup, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { BridgeLink } from "./bridge";
import { Keyboard, NumPad, SimulatorPanel } from "./components";
import { useDevice, useIdle } from "./hooks";

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

const labels = { name: "Căutare", space: "Spațiu", clear: "Șterge" };

describe("touch controls", () => {
  it("the keyboard types names in lower case, codes in capitals with digits", () => {
    const onChange = vi.fn();
    const { rerender } = render(<Keyboard value="an" onChange={onChange} labels={labels} />);
    fireEvent.click(screen.getByRole("button", { name: "Ș" }));
    fireEvent.click(screen.getByRole("button", { name: "Spațiu" }));
    fireEvent.click(screen.getByRole("button", { name: "⌫" }));
    fireEvent.click(screen.getByRole("button", { name: "Șterge" }));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(["anș", "an ", "a", ""]);
    expect(screen.queryByRole("button", { name: "7" })).toBeNull();
    rerender(<Keyboard value="AB" onChange={onChange} labels={labels} digits upper />);
    fireEvent.click(screen.getByRole("button", { name: "7" }));
    fireEvent.click(screen.getByRole("button", { name: "Q" }));
    expect(onChange.mock.calls.slice(-2).map((c) => c[0])).toEqual(["AB7", "ABQ"]);
    expect(screen.queryByRole("button", { name: "Spațiu" })).toBeNull();
  });

  it("the number pad hides a PIN and stops at its length", () => {
    const onChange = vi.fn();
    const { rerender } = render(<NumPad value="12345" onChange={onChange} label="PIN" clear="Șterge" secret />);
    expect(screen.getByRole("status", { hidden: true }).textContent).toContain("•••••");
    fireEvent.click(screen.getByRole("button", { name: "6" }));
    fireEvent.click(screen.getByRole("button", { name: "⌫" }));
    fireEvent.click(screen.getByRole("button", { name: "Șterge" }));
    expect(onChange.mock.calls.map((c) => c[0])).toEqual(["123456", "1234", ""]);
    rerender(<NumPad value="123456" onChange={onChange} label="PIN" clear="Șterge" />);
    fireEvent.click(screen.getByRole("button", { name: "0" }));
    expect(onChange).toHaveBeenCalledTimes(3); // full: nothing more
    expect(screen.getByRole("status", { hidden: true }).textContent).toContain("123456");
  });

  it("the simulator scans, inserts notes and causes faults (development only)", () => {
    const link = { simulateScan: vi.fn(), simulateNote: vi.fn(), simulateFault: vi.fn() };
    render(
      <SimulatorPanel
        link={link as unknown as BridgeLink}
        notes={[5000]}
        faults={[{ device: "cash", fault: "note_jam" }]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Scan" })); // empty: nothing
    fireEvent.change(screen.getByLabelText("Card code"), { target: { value: " CARD-1 " } });
    fireEvent.click(screen.getByRole("button", { name: "Scan" }));
    fireEvent.click(screen.getByRole("button", { name: "Insert 50 lei" }));
    fireEvent.click(screen.getByRole("button", { name: "note_jam" }));
    expect(link.simulateScan).toHaveBeenCalledTimes(1);
    expect(link.simulateScan).toHaveBeenCalledWith("CARD-1");
    expect(link.simulateNote).toHaveBeenCalledWith(5000);
    expect(link.simulateFault).toHaveBeenCalledWith("cash", "note_jam");
  });
});

class FakeSocket {
  static last: FakeSocket | null = null;
  readyState = 0;
  sent: string[] = [];
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onclose: (() => void) | null = null;
  constructor() {
    FakeSocket.last = this;
  }
  send(text: string) {
    this.sent.push(text);
  }
  close() {
    this.readyState = 3;
    this.onclose?.();
  }
}

describe("useDevice (ADR-0013)", () => {
  it("takes the configuration from the bridge and passes on scans and events", async () => {
    vi.stubGlobal("WebSocket", FakeSocket);
    const onScan = vi.fn();
    const onEvent = vi.fn();
    const { result, unmount } = renderHook(() =>
      useDevice({ bridgeUrl: "ws://127.0.0.1:8765", devConfig: null, onScan, onEvent }),
    );
    const socket = FakeSocket.last!;
    await act(async () => {
      socket.readyState = 1;
      socket.onopen?.();
    });
    const hello = JSON.parse(socket.sent[0]!);
    await act(async () => {
      socket.onmessage?.({
        data: JSON.stringify({ id: hello.id, ok: true, simulator: true, api_url: "http://club/api/v1", device_token: "d.s" }),
      });
      socket.onmessage?.({ data: JSON.stringify({ event: "scan", signed: { payload: { code: "C" }, signature: "s" } }) });
      socket.onmessage?.({ data: JSON.stringify({ event: "cash.complete", txn: "t" }) });
    });
    expect(result.current.config).toEqual({ apiUrl: "http://club/api/v1", token: "d.s" });
    expect(result.current.bridgeUp).toBe(true);
    expect(result.current.simulator).toBe(true);
    expect(onScan).toHaveBeenCalledWith({ signed: { payload: { code: "C" }, signature: "s" } });
    expect(onEvent).toHaveBeenCalledWith({ event: "cash.complete", txn: "t" });
    // A hello without a token (not enrolled yet) keeps the configuration as it was.
    await act(async () => {
      socket.onmessage?.({ data: JSON.stringify({ id: hello.id, ok: true, simulator: false }) });
    });
    unmount();
  });

  it("without a bridge (development), a keyboard-wedge scanner reads the card", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("WebSocket", FakeSocket);
    const onScan = vi.fn();
    const { result, rerender } = renderHook(({ wedge }) =>
      useDevice({ bridgeUrl: "ws://x", devConfig: { apiUrl: "http://a/api/v1", token: "t" }, onScan, wedge }),
      { initialProps: { wedge: true } },
    );
    expect(result.current.config).toEqual({ apiUrl: "http://a/api/v1", token: "t" });
    await act(async () => {
      FakeSocket.last!.close();
    });
    expect(result.current.bridgeUp).toBe(false);
    for (const key of [..."CARD1234", "Enter"]) window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    const input = document.createElement("input");
    document.body.append(input);
    input.dispatchEvent(new KeyboardEvent("keydown", { key: "X", bubbles: true }));
    input.remove();
    expect(onScan).toHaveBeenCalledWith({ token: "CARD1234" });
    rerender({ wedge: false });
    for (const key of [..."CARD5678", "Enter"]) window.dispatchEvent(new KeyboardEvent("keydown", { key }));
    expect(onScan).toHaveBeenCalledTimes(1);
  });
});

describe("useIdle", () => {
  it("counts down while active, starts again at a touch, waits while held", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    const { result, rerender } = renderHook(({ active, hold }) => useIdle(active, 5000, onTimeout, hold), {
      initialProps: { active: true, hold: false },
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.secondsLeft).toBe(2);
    act(() => {
      window.dispatchEvent(new Event("pointerdown"));
    });
    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    rerender({ active: true, hold: true });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onTimeout).not.toHaveBeenCalled();
    rerender({ active: true, hold: false });
    act(() => {
      vi.advanceTimersByTime(6000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    rerender({ active: false, hold: false });
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
    act(() => result.current.touch());
    expect(result.current.secondsLeft).toBe(5);
  });

  it("does not re-render an idle kiosk every second; counts from the touch that opens a session", () => {
    vi.useFakeTimers();
    const onTimeout = vi.fn();
    let renders = 0;
    const { result, rerender } = renderHook(
      ({ active }) => {
        renders += 1;
        return useIdle(active, 5000, onTimeout);
      },
      { initialProps: { active: false } },
    );
    act(() => {
      vi.advanceTimersByTime(60_000);
    });
    expect(renders).toBe(1);
    act(() => result.current.touch());
    rerender({ active: true });
    expect(result.current.secondsLeft).toBe(5);
    act(() => {
      vi.advanceTimersByTime(4000);
    });
    expect(result.current.secondsLeft).toBe(1);
    expect(onTimeout).not.toHaveBeenCalled();
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(onTimeout).toHaveBeenCalledTimes(1);
  });
});
