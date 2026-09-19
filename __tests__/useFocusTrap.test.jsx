import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React, { useRef } from "react";
import { render, fireEvent, act } from "@testing-library/react";
import { useFocusTrap } from "../src/lib/useFocusTrap";

function TestModal({ isOpen, onClose, hasInitialFocus = false }) {
  const containerRef = useRef(null);
  const initialFocusRef = useRef(null);

  useFocusTrap({
    isOpen,
    onClose,
    containerRef,
    initialFocusRef: hasInitialFocus ? initialFocusRef : undefined,
  });

  if (!isOpen) return null;

  return (
    <div ref={containerRef} role="dialog">
      <button id="btn-first">First</button>
      <input id="input-middle" ref={hasInitialFocus ? initialFocusRef : null} defaultValue="text" />
      <button id="btn-last">Last</button>
    </div>
  );
}

describe("useFocusTrap hook", () => {
  beforeEach(() => {
    document.body.style.overflow = "visible";
  });

  afterEach(() => {
    document.body.style.overflow = "visible";
  });

  it("locks body overflow when open and restores when closed", () => {
    const { rerender } = render(<TestModal isOpen={true} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("hidden");

    rerender(<TestModal isOpen={false} onClose={vi.fn()} />);
    expect(document.body.style.overflow).toBe("visible");
  });

  it("calls onClose when Escape key is pressed", () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not call onClose when other keys are pressed", () => {
    const onClose = vi.fn();
    render(<TestModal isOpen={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: "Enter" });
    expect(onClose).not.toHaveBeenCalled();
  });

  it("traps focus between first and last elements on Tab / Shift+Tab", () => {
    render(<TestModal isOpen={true} onClose={vi.fn()} />);

    const first = document.getElementById("btn-first");
    const last = document.getElementById("btn-last");

    // When on last element and Tab is pressed, loops back to first
    last.focus();
    expect(document.activeElement).toBe(last);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: false });
    expect(document.activeElement).toBe(first);

    // When on first element and Shift+Tab is pressed, loops to last
    first.focus();
    expect(document.activeElement).toBe(first);
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it("focuses initialFocusRef when provided", async () => {
    render(<TestModal isOpen={true} onClose={vi.fn()} hasInitialFocus={true} />);
    const middleInput = document.getElementById("input-middle");

    // Wait for requestAnimationFrame
    await act(async () => {
      await new Promise((r) => requestAnimationFrame(r));
    });

    expect(document.activeElement).toBe(middleInput);
  });
});
