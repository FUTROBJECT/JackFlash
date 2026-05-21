import React from "react";
import { COLORS } from "./constants.js";
import LightningBolt from "./LightningBolt.jsx";

/**
 * Shared JackFlash logo lockup — bolt + "JackFlash" wordmark.
 *
 * The whole lockup is driven by a single responsive root font-size; the bolt
 * and wordmark are both sized in `em`, so their relative proportions stay
 * locked at every viewport width (matching the approved logo art).
 *
 * Props:
 *   size        – overall scale ("large" | "medium" | "small"), default "medium"
 *   accentColor – passed through to LightningBolt
 *   subtitle    – optional small text beneath the lockup
 *   stacked     – bolt above the wordmark instead of beside it
 *   style       – extra styles on the wrapper div
 */
export default function LogoLockup({ size = "medium", accentColor, subtitle, stacked = false, style = {} }) {
  // Root font-size sets the lockup scale; the bolt and wordmark are sized in
  // em off it, so their proportions stay locked at every viewport width.
  const fontScale = {
    large: "clamp(42px, 12.5vw, 78px)",
    medium: "clamp(30px, 8vw, 50px)",
    small: "clamp(22px, 6vw, 34px)",
  };
  const root = fontScale[size] || fontScale.medium;

  // Bolt width in em. At 0.95em wide it renders ~1.27em tall (× 4/3) and the
  // wordmark sits at 0.88em, so the bolt reads as the taller, anchoring element.
  const boltEm = stacked ? "1.9em" : "0.95em";

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", fontSize: root, ...style }}>
      <div style={{
        display: "flex",
        flexDirection: stacked ? "column" : "row",
        alignItems: "center",
        gap: stacked ? "0.04em" : 0,
        justifyContent: "center",
      }}>
        <LightningBolt size={boltEm} accentColor={accentColor} />
        <h1 style={{
          fontFamily: "'Galindo', cursive",
          fontSize: "0.88em",
          fontWeight: 400,
          margin: 0,
          // Small positive offset gives the wordmark a touch of breathing room
          // from the bolt (the bolt SVG also carries some built-in whitespace).
          marginLeft: stacked ? 0 : "0.04em",
          color: COLORS.black,
          letterSpacing: "-0.03em",
          lineHeight: 1,
          whiteSpace: "nowrap",
        }}>
          JackFlash
        </h1>
      </div>
      {subtitle && (
        <p style={{
          fontSize: "0.3em",
          margin: "0.2em 0 0 0",
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
