import React from "react";
import { COLORS } from "./constants.js";
import LightningBolt from "./LightningBolt.jsx";

/**
 * Shared JackFlash logo lockup — bolt + "JackFlash" text.
 * Matches the practice page header styling (the canonical version).
 *
 * Props:
 *   size       – controls overall scale ("large" | "medium" | "small"), default "medium"
 *   accentColor – passed through to LightningBolt
 *   subtitle   – optional small text beneath the lockup
 *   style      – extra styles on the wrapper div
 */
export default function LogoLockup({ size = "medium", accentColor, subtitle, stacked = false, style = {} }) {
  const sizes = {
    large: { bolt: 80, boltStacked: 140, font: "clamp(56px, 14vw, 82px)" },
    medium: { bolt: 60, boltStacked: 100, font: "clamp(34px, 9vw, 52px)" },
    small: { bolt: 44, boltStacked: 70, font: "clamp(26px, 7vw, 38px)" },
  };
  const s = sizes[size] || sizes.medium;
  const boltSize = stacked ? s.boltStacked : s.bolt;

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", ...style }}>
      <div style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        gap: stacked ? "4px" : "6px",
        justifyContent: "center",
      }}>
        <LightningBolt size={boltSize} accentColor={accentColor} />
        <h1 style={{
          fontFamily: "'Galindo', cursive",
          fontSize: s.font,
          fontWeight: 400,
          margin: 0,
          color: COLORS.black,
          letterSpacing: "-0.03em",
          whiteSpace: "nowrap",
        }}>
          JackFlash
        </h1>
      </div>
      {subtitle && (
        <p style={{
          fontSize: "13px",
          margin: "6px 0 0 0",
          fontWeight: 600,
          fontFamily: "'Space Mono', monospace",
          color: "#666",
          letterSpacing: "1px",
          textTransform: "uppercase",
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}
