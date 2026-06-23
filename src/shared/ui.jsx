// Shared neo-brutalist UI primitives — the clean "Unstructured-style" language:
// dotted-divider lists, checkbox markers, +/− toggles, and solid-fill accent
// callouts. Deliberately FLAT (no drop-shadows) and with NO left-stripe accents.
import { useState, useEffect, useRef } from "react";
import { COLORS, BRUTAL_BORDER_SM, BRUTAL_SHADOW_SM, DOTTED_RULE } from "../constants.js";

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

// Flat custom dropdown replacing the native <select>. A native select's open
// popup is rendered by the OS (the glassy 3D look) and can't be styled, so we
// render our own button + opaque flat panel instead. `options` is
// [{ value, label }]; `onChange` receives the chosen value (not an event).
export function Dropdown({ value, onChange, options, style }) {
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(-1);
  const ref = useRef(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("pointerdown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} style={{ position: "relative", ...style }}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%",
          padding: "9px 12px",
          borderRadius: "8px",
          border: BRUTAL_BORDER_SM,
          backgroundColor: "white",
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: "14px",
          fontWeight: 600,
          color: COLORS.black,
          cursor: "pointer",
          boxSizing: "border-box",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "10px",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selected ? selected.label : ""}
        </span>
        <span aria-hidden style={{
          flexShrink: 0,
          fontFamily: "'Space Mono', monospace",
          fontSize: "11px",
          transform: open ? "rotate(180deg)" : "rotate(0deg)",
          transition: "transform 0.15s ease",
        }}>▼</span>
      </button>
      {open && (
        <div style={{
          position: "absolute",
          top: "calc(100% + 5px)",
          left: 0,
          right: 0,
          backgroundColor: "white",
          border: BRUTAL_BORDER_SM,
          borderRadius: "8px",
          boxShadow: BRUTAL_SHADOW_SM,
          overflow: "hidden",
          zIndex: 30,
          animation: "fadeSlideUp 0.15s ease both",
        }}>
          {options.map((o, i) => {
            const isSel = o.value === value;
            const isHover = hovered === i;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                onPointerEnter={() => setHovered(i)}
                onPointerLeave={() => setHovered((h) => (h === i ? -1 : h))}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "none",
                  borderTop: i === 0 ? "none" : `2px solid ${COLORS.black}`,
                  backgroundColor: isSel ? COLORS.cream : (isHover ? "#F2F2F2" : "white"),
                  fontFamily: "'Space Grotesk', sans-serif",
                  fontSize: "14px",
                  fontWeight: isSel ? 700 : 500,
                  color: COLORS.black,
                  cursor: "pointer",
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                }}
              >
                <span aria-hidden style={{ width: "14px", flexShrink: 0, fontWeight: 700 }}>{isSel ? "✓" : ""}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.label}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
