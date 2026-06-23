// Shared neo-brutalist UI primitives — the clean "Unstructured-style" language:
// dotted-divider lists, checkbox markers, +/− toggles, and solid-fill accent
// callouts. Deliberately FLAT (no drop-shadows) and with NO left-stripe accents.
import { useState } from "react";
import { COLORS, BRUTAL_BORDER_SM, DOTTED_RULE } from "../constants.js";

// Progress-grid cell label: the actual problem from an item key rather than the
// repeated skill id. Keys are `prefix:…:content` (e.g. "build:2/3", "add:col:342+215",
// "mix:drill:name:1/2"); we surface the trailing content after the last colon.
export function itemCellLabel(itemKey) {
  if (!itemKey) return "";
  const colon = itemKey.lastIndexOf(":");
  const content = colon >= 0 ? itemKey.slice(colon + 1) : itemKey;
  return content.replace(/,/g, " ");
}

// Expandable list row: dotted rule + pink checkbox marker + bold title + +/− toggle.
// Stack several together (each renders its own top rule) and cap with a trailing
// <div style={DOTTED_RULE} /> to close the list.
export function AccordionItem({ title, children, defaultOpen = false, marker = "✓" }) {
  const [open, setOpen] = useState(defaultOpen);
  const [pressed, setPressed] = useState(false);
  return (
    <div>
      <div style={DOTTED_RULE} />
      <button
        onClick={() => setOpen((o) => !o)}
        onPointerDown={() => setPressed(true)}
        onPointerUp={() => setPressed(false)}
        onPointerLeave={() => setPressed(false)}
        onPointerCancel={() => setPressed(false)}
        style={{
          width: "100%",
          background: "none",
          border: "none",
          padding: "16px 2px",
          display: "flex",
          alignItems: "center",
          gap: "14px",
          cursor: "pointer",
          textAlign: "left",
        }}
      >
        <span aria-hidden style={{
          flexShrink: 0,
          width: "30px",
          height: "30px",
          borderRadius: "7px",
          backgroundColor: COLORS.pink,
          border: BRUTAL_BORDER_SM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: COLORS.black,
          fontSize: "15px",
          fontWeight: 700,
          lineHeight: 1,
        }}>{marker}</span>
        <span style={{
          flex: 1,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "17px",
          fontWeight: 700,
          color: COLORS.black,
        }}>{title}</span>
        <span aria-hidden style={{
          flexShrink: 0,
          width: "30px",
          height: "30px",
          borderRadius: "7px",
          backgroundColor: open ? COLORS.yellow : "#E8E8E8",
          border: BRUTAL_BORDER_SM,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Space Mono', monospace",
          fontSize: "20px",
          fontWeight: 700,
          lineHeight: 1,
          color: COLORS.black,
          transform: pressed ? "scale(0.9)" : "scale(1)",
          transition: "background 0.15s, transform 0.12s ease",
        }}>{open ? "−" : "+"}</span>
      </button>
      {open && (
        <div style={{
          padding: "0 2px 18px 44px",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "14px",
          lineHeight: 1.7,
          color: COLORS.black,
          animation: "fadeSlideUp 0.2s ease both",
        }}>
          {children}
        </div>
      )}
    </div>
  );
}

// Solid-fill accent callout — the "Perfect For" pattern. Filled box, bold title,
// dotted rule, then content. Replaces left-stripe accent boxes. Flat (no shadow).
export function Callout({ title, color = COLORS.pink, children, style }) {
  return (
    <div style={{
      backgroundColor: color,
      border: BRUTAL_BORDER_SM,
      borderRadius: "14px",
      padding: "18px 18px 20px",
      ...style,
    }}>
      {title && (
        <>
          <div style={{
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: "18px",
            fontWeight: 700,
            color: COLORS.black,
            marginBottom: "12px",
          }}>{title}</div>
          <div style={{ ...DOTTED_RULE, marginBottom: "14px" }} />
        </>
      )}
      {children}
    </div>
  );
}
