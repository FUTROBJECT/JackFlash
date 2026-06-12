import React, { useState } from "react";
import { COLORS, BRUTAL_SHADOW_SM, BRUTAL_BORDER_SM, BRUTAL_BORDER } from "../constants.js";

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function gcd(a, b) {
  a = Math.abs(a);
  b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a;
}

function simplify(n, d) {
  const g = gcd(n, d);
  return [n / g, d / g];
}

// ---------------------------------------------------------------------------
// Visual Components
// ---------------------------------------------------------------------------

/**
 * FractionDisplay – renders n/d as a proper typeset fraction (stacked).
 * Used everywhere we show a fraction symbol (not the input fields).
 */
export function FractionDisplay({ n, d, size = "normal", color = COLORS.black, highlight = false }) {
  const sizes = {
    small:  { num: 13, line: 1.5, dn: 13, pad: "1px 5px" },
    normal: { num: 18, line: 2,   dn: 18, pad: "2px 8px" },
    large:  { num: 28, line: 2.5, dn: 28, pad: "3px 12px" },
    hero:   { num: 48, line: 3.5, dn: 48, pad: "4px 16px" },
  };
  const s = sizes[size] || sizes.normal;
  return (
    <span style={{
      display: "inline-flex",
      flexDirection: "column",
      alignItems: "center",
      fontFamily: "'Shrikhand', cursive",
      color,
      background: highlight ? COLORS.yellow : "transparent",
      border: highlight ? BRUTAL_BORDER_SM : "none",
      borderRadius: highlight ? "6px" : 0,
      padding: highlight ? s.pad : 0,
      lineHeight: 1.1,
      verticalAlign: "middle",
    }}>
      <span style={{ fontSize: s.num, lineHeight: 1 }}>{n}</span>
      <span style={{
        display: "block",
        height: `${s.line}px`,
        width: "100%",
        backgroundColor: color,
        margin: "2px 0",
        borderRadius: "1px",
      }} />
      <span style={{ fontSize: s.dn, lineHeight: 1 }}>{d}</span>
    </span>
  );
}

/**
 * FractionBar – a horizontal bar split into d equal parts with n shaded.
 * interactive=true: segments are tappable (toggle shading).
 * shadedCount / onShadedChange: controlled externally when interactive.
 */
export function FractionBar({
  n, d, color = COLORS.purple, opacity = 1, animate = false,
  interactive = false, shadedCount = null, onShadedChange = null,
  label = null, compact = false,
}) {
  const segH = interactive ? 60 : (compact ? 24 : 36);
  const controlled = shadedCount !== null;
  const shaded = controlled ? shadedCount : n;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: interactive ? "none" : 340 }}>
      {label && (
        <div style={{
          fontFamily: "'Space Mono', monospace", fontSize: 12, fontWeight: 700,
          marginBottom: 4, color: COLORS.black,
        }}>{label}</div>
      )}
      <div style={{ display: "flex", gap: 3 }}>
        {Array.from({ length: d }).map((_, i) => {
          const isShaded = i < shaded;
          return (
            <div
              key={i}
              onClick={interactive && onShadedChange ? () => {
                // Toggle: clicking segment i means shading i+1 parts (or 0 if all shaded up to i)
                const newCount = (shaded === i + 1) ? 0 : i + 1;
                onShadedChange(newCount);
              } : undefined}
              style={{
                flex: 1,
                height: segH,
                backgroundColor: isShaded ? color : "#F0F0F0",
                border: `2px solid ${COLORS.black}`,
                borderRadius: 4,
                cursor: interactive ? "pointer" : "default",
                transition: "background-color 0.15s ease",
                animation: animate && isShaded ? `dotPop 0.25s ease ${i * 40}ms both` : "none",
              }}
            />
          );
        })}
      </div>
      {!compact && (
        <div style={{
          textAlign: "center",
          fontFamily: "'Space Mono', monospace",
          fontSize: 11, fontWeight: 700,
          marginTop: 4, opacity: 0.5,
          color: COLORS.black,
        }}>
          {shaded}/{d}
        </div>
      )}
    </div>
  );
}

/**
 * TwoStackedBars – shows two bars of identical length for equivalence / comparison.
 * top: { n, d, label? }   bottom: { n, d, color?, label? }
 * Optionally interactive on the bottom bar (split stepper).
 */
export function TwoStackedBars({ top, bottom, animate = false, opacity = 1 }) {
  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      <FractionBar n={top.n} d={top.d} color={COLORS.purple} label={top.label} animate={animate} />
      <div style={{ height: 8 }} />
      <FractionBar n={bottom.n} d={bottom.d} color={bottom.color || COLORS.blue} label={bottom.label} animate={animate} />
    </div>
  );
}

/**
 * AddBarsScaffold – shows addend bars + result bar for A-group.
 * a = { n, d }  b = { n, d }  result = { n, d }
 * For related fractions, shows the conversion step.
 */
export function AddBarsScaffold({ a, b, result, isSubtract = false, opacity = 1, animate = false }) {
  // For related fractions: find a common denominator
  const lcd = (a.d * b.d) / gcd(a.d, b.d);
  const aConv = { n: a.n * (lcd / a.d), d: lcd };
  const bConv = { n: b.n * (lcd / b.d), d: lcd };
  const isRelated = a.d !== b.d;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 340 }}>
      <FractionBar
        n={a.n} d={a.d} color={COLORS.purple}
        label={isRelated && a.d !== lcd ? `${a.n}/${a.d} → ${aConv.n}/${aConv.d}` : `${a.n}/${a.d}`}
        animate={animate}
      />
      <div style={{ height: 6 }} />
      {!isSubtract && (
        <FractionBar
          n={b.n} d={b.d} color={COLORS.blue}
          label={isRelated && b.d !== lcd ? `${b.n}/${b.d} → ${bConv.n}/${bConv.d}` : `${b.n}/${b.d}`}
          animate={animate}
        />
      )}
      {isSubtract && (
        <FractionBar
          n={b.n} d={b.d} color={COLORS.orange}
          label={isRelated && b.d !== lcd ? `${b.n}/${b.d} → ${bConv.n}/${bConv.d}` : `${b.n}/${b.d}`}
          animate={animate}
        />
      )}
      <div style={{ height: 4, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ height: 2, width: "100%", backgroundColor: COLORS.black, opacity: 0.3 }} />
      </div>
      <FractionBar
        n={result.n} d={result.d} color={COLORS.green}
        label={`= ${result.n}/${result.d}`}
        animate={animate}
      />
    </div>
  );
}

/**
 * NumberLineScaffold – shows a 0–1 number line partitioned into d parts with the
 * fraction n/d marked.
 */
export function NumberLineScaffold({ n, d, opacity = 1, animate = false }) {
  const W = 300, H = 60, padL = 18, padR = 18;
  const lineW = W - padL - padR;
  const tickH = 10, lineY = 38;
  const markerX = padL + (n / d) * lineW;

  return (
    <div style={{ opacity, transition: "opacity 0.6s ease", width: "100%", maxWidth: 300 }}>
      <svg width="100%" height={H} viewBox={`0 0 ${W} ${H}`} style={{ overflow: "visible", display: "block" }}>
        {/* Main line */}
        <line x1={padL} y1={lineY} x2={W - padR} y2={lineY}
          stroke={COLORS.black} strokeWidth={3} strokeLinecap="round" />
        {/* 0 label */}
        <text x={padL} y={lineY + 18} textAnchor="middle"
          fontFamily="'Space Mono', monospace" fontSize={12} fontWeight={700} fill={COLORS.black}>0</text>
        {/* 1 label */}
        <text x={W - padR} y={lineY + 18} textAnchor="middle"
          fontFamily="'Space Mono', monospace" fontSize={12} fontWeight={700} fill={COLORS.black}>1</text>
        {/* Tick marks */}
        {Array.from({ length: d + 1 }).map((_, i) => {
          const x = padL + (i / d) * lineW;
          return (
            <line key={i} x1={x} y1={lineY - tickH / 2} x2={x} y2={lineY + tickH / 2}
              stroke={COLORS.black} strokeWidth={2} />
          );
        })}
        {/* Marker dot */}
        <circle cx={markerX + 2} cy={lineY + 2} r={9} fill={COLORS.black}
          style={{ animation: animate ? "dotPop 0.4s ease both" : "none" }} />
        <circle cx={markerX} cy={lineY} r={9} fill={COLORS.purple} stroke={COLORS.black} strokeWidth={2.5}
          style={{ animation: animate ? "dotPop 0.4s ease both" : "none" }} />
        {/* Label above marker */}
        <text x={markerX} y={lineY - 14} textAnchor="middle"
          fontFamily="'Shrikhand', cursive" fontSize={14} fill={COLORS.purple}>
          {n}/{d}
        </text>
      </svg>
    </div>
  );
}

/**
 * FractionFamilyStrip – the "same-pieces" hint strip.
 * Shows a fraction family ladder with a highlighted target.
 * families: array like [{n,d}]  highlight: {n,d} to highlight
 */
export function FractionFamilyStrip({ family, highlight }) {
  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "center", marginTop: 8,
    }}>
      {family.map((f, i) => {
        const isHL = highlight && f.n === highlight.n && f.d === highlight.d;
        return (
          <React.Fragment key={i}>
            <span style={{
              fontFamily: "'Space Mono', monospace",
              fontSize: 13,
              fontWeight: isHL ? 700 : 400,
              backgroundColor: isHL ? COLORS.yellow : "transparent",
              border: isHL ? BRUTAL_BORDER_SM : "none",
              borderRadius: isHL ? 4 : 0,
              padding: isHL ? "2px 6px" : 0,
              color: isHL ? COLORS.black : "#888",
              animation: isHL ? "fadeSlideUp 0.3s ease both" : "none",
            }}>
              {f.n}/{f.d}
            </span>
            {i < family.length - 1 && (
              <span style={{ color: "#CCC", fontFamily: "'Space Mono', monospace", fontSize: 13 }}>→</span>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

/**
 * FractionPartWholeBond – like NumberBond but with fraction labels.
 */
export function FractionPartWholeBond({ whole, partA, partB }) {
  const W = 200, H = 120;
  const wholeCx = W / 2, wholeCy = 26;
  const leftCx = 36, leftCy = 95;
  const rightCx = W - 36, rightCy = 95;
  const r1 = 28, r2 = 22;

  const renderLabel = (n, d, cx, cy, r, fillColor = COLORS.blue) => (
    <g>
      <circle cx={cx + 2} cy={cy + 2} r={r} fill={COLORS.black} />
      <circle cx={cx} cy={cy} r={r} fill={fillColor} stroke={COLORS.black} strokeWidth={3} />
      <foreignObject x={cx - r} y={cy - r} width={r * 2} height={r * 2}>
        <div
          xmlns="http://www.w3.org/1999/xhtml"
          style={{
            width: "100%", height: "100%",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <FractionDisplay n={n} d={d} size="small" />
        </div>
      </foreignObject>
    </g>
  );

  return (
    <div style={{ display: "flex", justifyContent: "center", marginTop: 12, animation: "fadeSlideUp 0.4s ease both" }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}>
        <line x1={wholeCx} y1={wholeCy + r1} x2={leftCx} y2={leftCy - r2}
          stroke={COLORS.black} strokeWidth={3} />
        <line x1={wholeCx} y1={wholeCy + r1} x2={rightCx} y2={rightCy - r2}
          stroke={COLORS.black} strokeWidth={3} />
        {/* Whole = 1 */}
        <circle cx={wholeCx + 3} cy={wholeCy + 3} r={r1} fill={COLORS.black} />
        <circle cx={wholeCx} cy={wholeCy} r={r1} fill={COLORS.yellow} stroke={COLORS.black} strokeWidth={3} />
        <text x={wholeCx} y={wholeCy + 1} textAnchor="middle" dominantBaseline="central"
          fontFamily="'Shrikhand', cursive" fontSize={16} fontWeight={700} fill={COLORS.black}>1</text>
        {/* Part A */}
        {renderLabel(partA.n, partA.d, leftCx, leftCy, r2, COLORS.blue)}
        {/* Part B */}
        {renderLabel(partB.n, partB.d, rightCx, rightCy, r2, COLORS.green)}
      </svg>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Problem Pool Generation
// ---------------------------------------------------------------------------

/**
 * Build all fraction items for the fractions module.
 * Returns an array of item objects shaped like:
 *   { itemKey, skill, group, answerType, ... skill-specific fields }
 *
 * The difficulty ordering within each skill follows the spec §4:
 *   smaller denominators first; unit before non-unit; halves > thirds > fives.
 */
function buildFractionPool() {
  const items = [];

  // ---- Group F: Foundations -----------------------------------------------

  // F1: Name the fraction (4-choice tap)
  // Pool: all proper n/d for d in {2,3,4,5,6,7,8,10,11,12}
  const f1Denoms = [2,3,4,5,6,7,8,10,11,12];
  f1Denoms.forEach(d => {
    for (let n = 1; n < d; n++) {
      // Curate: for d ≥ 7, include only n=1 and n=d-1
      if (d >= 7 && n !== 1 && n !== d - 1) continue;
      const key = `name:${n}/${d}`;
      // Build distractors: inverted (d/n), parts-unshaded ((d-n)/d), n+1/d+1
      const distractors = buildF1Distractors(n, d);
      items.push({
        itemKey: key, skill: "F1", group: "foundations",
        answerType: "choice4",
        n, d,
        correctAnswer: `${n}/${d}`,
        distractors,
        displayType: "bar", // or "circle" for ~1/3 of items — alternate by index below
      });
    }
  });
  // Mark every 3rd item as circle display
  let f1Idx = 0;
  items.filter(i => i.skill === "F1").forEach(item => {
    if (f1Idx % 3 === 2) item.displayType = "circle";
    f1Idx++;
  });

  // F2: Build the fraction (shade-the-bar submit)
  // Same pool as F1, d ≤ 12
  f1Denoms.forEach(d => {
    for (let n = 1; n < d; n++) {
      if (d >= 7 && n !== 1 && n !== d - 1) continue;
      items.push({
        itemKey: `build:${n}/${d}`, skill: "F2", group: "foundations",
        answerType: "buildBar",
        n, d,
        correctAnswer: n,
      });
    }
  });

  // F3: Compare unit fractions (tap-one-of-two)
  const f3Pairs = [];
  const f3Denoms = [2,3,4,5,6,8,9,10,12];
  for (let i = 0; i < f3Denoms.length; i++) {
    for (let j = i + 1; j < f3Denoms.length; j++) {
      const a = f3Denoms[i], b = f3Denoms[j];
      // Store smaller denominator first (larger fraction first)
      f3Pairs.push({ a, b }); // 1/a > 1/b because a < b
    }
  }
  // Curate to ~16 pairs (smallest denominators first)
  f3Pairs.slice(0, 16).forEach(({ a, b }) => {
    items.push({
      itemKey: `ucmp:1/${a},1/${b}`, skill: "F3", group: "foundations",
      answerType: "tapTwo",
      left: { n: 1, d: a },
      right: { n: 1, d: b },
      correctAnswer: `1/${a}`, // larger value (smaller denominator)
      questionText: "Which is greater?",
    });
  });

  // F4: Compare like fractions (tap-one-of-two)
  const f4Items = [];
  const likeDenoms = [3,4,5,6,8,10,12];
  likeDenoms.forEach(d => {
    for (let n1 = 1; n1 < d - 1; n1++) {
      for (let n2 = n1 + 1; n2 < d; n2++) {
        f4Items.push({ d, n1, n2 });
      }
    }
  });
  // Curate ~16
  f4Items.slice(0, 16).forEach(({ d, n1, n2 }) => {
    items.push({
      itemKey: `lcmp:${n1}/${d},${n2}/${d}`, skill: "F4", group: "foundations",
      answerType: "tapTwo",
      left: { n: n1, d },
      right: { n: n2, d },
      correctAnswer: `${n2}/${d}`, // larger numerator = larger value
      questionText: "Which is greater?",
    });
  });

  // ---- Group E: Equivalent Fractions ---------------------------------------

  // E1: Spot the equivalent (4-choice tap)
  const e1Bases = [
    {n:1,d:2},{n:1,d:3},{n:2,d:3},{n:1,d:4},{n:3,d:4},
    {n:1,d:5},{n:2,d:5},{n:3,d:5},{n:4,d:5},{n:1,d:6},{n:5,d:6},
  ];
  e1Bases.forEach(base => {
    [2,3,4].forEach(mult => {
      const nd = base.n * mult, dd = base.d * mult;
      if (dd > 12) return;
      const key = `equiv:${base.n}/${base.d}=${nd}/${dd}`;
      const distractors = buildE1Distractors(base.n, base.d, nd, dd, mult);
      items.push({
        itemKey: key, skill: "E1", group: "equivalent",
        answerType: "choice4",
        base, target: { n: nd, d: dd }, mult,
        correctAnswer: `${nd}/${dd}`,
        distractors,
        questionText: `Which fraction equals`,
      });
    });
  });

  // E2: Missing number (single-number typed input)
  e1Bases.forEach(base => {
    [2,3,4].forEach(mult => {
      const nd = base.n * mult, dd = base.d * mult;
      if (dd > 12) return;
      // Blank numerator
      items.push({
        itemKey: `emiss:${base.n}/${base.d}=?/${dd}`, skill: "E2", group: "equivalent",
        answerType: "singleNumber",
        base, target: { n: nd, d: dd }, mult,
        blankIs: "numerator",
        correctAnswer: nd,
        questionText: `${base.n}/${base.d} = ?/${dd}`,
      });
      // Blank denominator
      items.push({
        itemKey: `emiss:${base.n}/${base.d}=${nd}/?`, skill: "E2", group: "equivalent",
        answerType: "singleNumber",
        base, target: { n: nd, d: dd }, mult,
        blankIs: "denominator",
        correctAnswer: dd,
        questionText: `${base.n}/${base.d} = ${nd}/?`,
      });
    });
  });

  // E3: Simplest form (fraction input — two fields)
  // All non-simplest n/d with d ≤ 12 reducible in one step
  const reduciblePairs = [];
  for (let d = 2; d <= 12; d++) {
    for (let n = 1; n < d; n++) {
      const [sn, sd] = simplify(n, d);
      if (sd !== d) { // not already simplified
        reduciblePairs.push({ n, d, sn, sd });
      }
    }
  }
  // Deduplicate by itemKey
  const e3Seen = new Set();
  reduciblePairs.forEach(({ n, d, sn, sd }) => {
    const key = `simp:${n}/${d}`;
    if (e3Seen.has(key)) return;
    e3Seen.add(key);
    items.push({
      itemKey: key, skill: "E3", group: "equivalent",
      answerType: "fractionInput",
      n, d, sn, sd,
      correctAnswer: `${sn}/${sd}`,
      questionText: `Simplify`,
    });
  });

  // E4: Number line identification (4-choice tap)
  const e4Denoms = [2,3,4,5,6,8,10,12];
  const e4Items = [];
  e4Denoms.forEach(d => {
    for (let n = 1; n < d; n++) {
      e4Items.push({ n, d });
    }
  });
  // Curate ~20
  e4Items.slice(0, 20).forEach(({ n, d }) => {
    const distractors = buildE4Distractors(n, d);
    items.push({
      itemKey: `nline:${n}/${d}`, skill: "E4", group: "equivalent",
      answerType: "choice4",
      n, d,
      correctAnswer: `${n}/${d}`,
      distractors,
      questionText: "What fraction is marked?",
    });
  });

  // ---- Group C: Compare & Order --------------------------------------------

  // C1: Compare two unlike fractions (tap-one-of-two or "equal")
  const c1Pairs = buildC1Pairs();
  c1Pairs.forEach(({ a, b, answer }) => {
    const key = `cmp:${a.n}/${a.d},${b.n}/${b.d}`;
    items.push({
      itemKey: key, skill: "C1", group: "compare",
      answerType: "tapTwoOrEqual",
      left: a, right: b,
      correctAnswer: answer, // "left" | "right" | "equal"
      questionText: "Which is greater?",
    });
  });

  // C2: Order three fractions (tap-in-sequence)
  const c2Triples = buildC2Triples();
  c2Triples.forEach(({ fracs, order, direction }) => {
    const key = `ord:${fracs.map(f => `${f.n}/${f.d}`).join(",")}`;
    items.push({
      itemKey: key, skill: "C2", group: "compare",
      answerType: "orderThree",
      fracs,
      order, // indices in sorted order
      direction, // "asc" or "desc"
      questionText: direction === "asc" ? "Order from smallest to greatest" : "Order from greatest to smallest",
    });
  });

  // ---- Group A: Add & Subtract --------------------------------------------

  // ---- A1: Add like fractions — curated pool of 26 items ----
  // Curation rule: ~4 items per denominator (d ∈ {3,4,5,6,8,10,12}), chosen to
  // cover unit addends, near-equal addends, and a large-sum pair.
  // d=3 has only 2 valid items so all are included; larger denoms use a stride
  // across (lo, hi) pairs to maximise variety and avoid near-duplicates.
  // Keys are commutatively collapsed (lo ≤ hi) — unchanged from the spec format.
  const A1_KEYS = new Set([
    // d=3 (2 valid items — include both)
    "addL:1/3+1/3", "addL:1/3+2/3",
    // d=4 (4 of 4 valid)
    "addL:1/4+1/4", "addL:1/4+2/4", "addL:1/4+3/4", "addL:2/4+2/4",
    // d=5 (4 of 6: unit pair, unit+mid, unit+large, mid+mid)
    "addL:1/5+1/5", "addL:1/5+2/5", "addL:1/5+4/5", "addL:2/5+3/5",
    // d=6 (4 of 9: unit pair, unit+half, unit+large, mid+mid)
    "addL:1/6+1/6", "addL:1/6+3/6", "addL:1/6+5/6", "addL:2/6+4/6",
    // d=8 (4 of 16: stride across the range)
    "addL:1/8+1/8", "addL:1/8+3/8", "addL:1/8+7/8", "addL:3/8+5/8",
    // d=10 (4 of 25: stride)
    "addL:1/10+1/10", "addL:1/10+3/10", "addL:1/10+9/10", "addL:3/10+7/10",
    // d=12 (4 of 36: stride)
    "addL:1/12+1/12", "addL:1/12+5/12", "addL:1/12+11/12", "addL:5/12+7/12",
  ]);

  A1_KEYS.forEach(key => {
    const m = key.match(/addL:(\d+)\/(\d+)\+(\d+)\/(\d+)/);
    const [lo, d, hi] = [+m[1], +m[2], +m[3]];
    const rn = lo + hi;
    const [sn, sd] = simplify(rn, d);
    items.push({
      itemKey: key, skill: "A1", group: "addSubtract",
      answerType: "fractionInput",
      a: { n: lo, d }, b: { n: hi, d },
      correctAnswer: `${rn}/${d}`,
      altAnswer: (sn === rn && sd === d) ? null : `${sn}/${sd}`,
      questionText: `${lo}/${d} + ${hi}/${d} = ?`,
    });
  });

  // ---- A2: Subtract like fractions — curated pool of 26 items ----
  // Curation rule: ~3-4 items per denominator; 7 "whole-minus" items of the
  // form d/d − n/d distributed across denoms to illustrate 1 − n/d thinking.
  // Non-whole items are chosen to vary both minuend and subtrahend numerators.
  const A2_KEYS = [
    // d=3 (2 items: 1 regular, 1 whole-minus)
    "subL:2/3-1/3",   "subL:3/3-1/3",
    // d=4 (4 items: 3 regular, 1 whole-minus)
    "subL:2/4-1/4",   "subL:3/4-1/4",   "subL:3/4-2/4",   "subL:4/4-3/4",
    // d=5 (3 items: 2 regular, 1 whole-minus)
    "subL:3/5-2/5",   "subL:4/5-1/5",   "subL:5/5-2/5",
    // d=6 (4 items: 3 regular, 1 whole-minus)
    "subL:3/6-1/6",   "subL:4/6-2/6",   "subL:5/6-3/6",   "subL:6/6-5/6",
    // d=8 (4 items: 3 regular, 1 whole-minus)
    "subL:3/8-1/8",   "subL:5/8-3/8",   "subL:7/8-3/8",   "subL:8/8-1/8",
    // d=10 (4 items: 3 regular, 1 whole-minus)
    "subL:3/10-1/10", "subL:7/10-3/10", "subL:9/10-7/10", "subL:10/10-3/10",
    // d=12 (5 items: 3 regular, 2 whole-minus — larger pool warrants extra coverage)
    "subL:3/12-1/12", "subL:7/12-3/12", "subL:11/12-5/12",
    "subL:12/12-4/12", "subL:12/12-8/12",
  ];

  A2_KEYS.forEach(key => {
    const m = key.match(/subL:(\d+)\/(\d+)-(\d+)\/(\d+)/);
    const [n1, d, n2] = [+m[1], +m[2], +m[3]];
    const rn = n1 - n2;
    const [sn, sd] = simplify(rn, d);
    items.push({
      itemKey: key, skill: "A2", group: "addSubtract",
      answerType: "fractionInput",
      a: { n: n1, d }, b: { n: n2, d },
      isSubtract: true,
      correctAnswer: `${rn}/${d}`,
      altAnswer: `${sn}/${sd}`,
      questionText: n1 === d ? `${d}/${d} − ${n2}/${d} = ?` : `${n1}/${d} − ${n2}/${d} = ?`,
      showAsWhole: n1 === d,
    });
  });

  // ---- A3: Add two related fractions — curated pool of 24 items ----
  // Curation rule: exactly 2 items per related-denominator pair (all 12 pairs
  // from the spec §2 are covered). For each pair [d1, d2]:
  //   • item 1 = smallest valid (n1=1, n2=1) — simplest conversion
  //   • item 2 = largest valid (highest sum still ≤ 1) — challenges full range
  // This gives 24 items (12 pairs × 2), all sums within one whole.
  const relatedPairs = [
    [2,4],[2,6],[2,8],[2,10],[2,12],
    [3,6],[3,9],[3,12],[4,8],[4,12],[5,10],[6,12],
  ];
  const A3_KEYS = [
    // (2,4): 1/2+1/4=3/4,  1/2+2/4=4/4 — NOTE 2/4=1/2 so 1/2+1/2=1 exactly
    "addR:1/2+1/4",  "addR:1/2+2/4",
    // (2,6)
    "addR:1/2+1/6",  "addR:1/2+3/6",
    // (2,8)
    "addR:1/2+1/8",  "addR:1/2+4/8",
    // (2,10)
    "addR:1/2+1/10", "addR:1/2+5/10",
    // (2,12)
    "addR:1/2+1/12", "addR:1/2+6/12",
    // (3,6)
    "addR:1/3+1/6",  "addR:2/3+2/6",
    // (3,9)
    "addR:1/3+1/9",  "addR:2/3+3/9",
    // (3,12)
    "addR:1/3+1/12", "addR:2/3+4/12",
    // (4,8)
    "addR:1/4+1/8",  "addR:3/4+2/8",
    // (4,12)
    "addR:1/4+1/12", "addR:3/4+3/12",
    // (5,10)
    "addR:1/5+1/10", "addR:4/5+2/10",
    // (6,12)
    "addR:1/6+1/12", "addR:5/6+2/12",
  ];

  A3_KEYS.forEach(key => {
    const m = key.match(/addR:(\d+)\/(\d+)\+(\d+)\/(\d+)/);
    const [n1, d1, n2, d2] = [+m[1], +m[2], +m[3], +m[4]];
    const lcd = d2; // d2 is always the larger denominator
    const rn = n1 * (lcd / d1) + n2;
    const [sn, sd] = simplify(rn, lcd);
    items.push({
      itemKey: key, skill: "A3", group: "addSubtract",
      answerType: "fractionInput",
      a: { n: n1, d: d1 }, b: { n: n2, d: d2 },
      lcd,
      correctAnswer: `${rn}/${lcd}`,
      altAnswer: (sn === rn && sd === lcd) ? null : `${sn}/${sd}`,
      questionText: `${n1}/${d1} + ${n2}/${d2} = ?`,
    });
  });

  // ---- A4: Subtract two related fractions — curated pool of 24 items ----
  // Same curation rule as A3: 2 items per pair, all 12 pairs covered.
  //   • item 1 = first valid (smallest minuend, smallest subtrahend)
  //   • item 2 = last valid (largest minuend still ≤ 1, largest subtrahend)
  const A4_KEYS = [
    // (2,4)
    "subR:3/4-1/2",  "subR:4/4-1/2",
    // (2,6)
    "subR:4/6-1/2",  "subR:6/6-1/2",
    // (2,8)
    "subR:5/8-1/2",  "subR:8/8-1/2",
    // (2,10)
    "subR:6/10-1/2", "subR:10/10-1/2",
    // (2,12)
    "subR:7/12-1/2", "subR:12/12-1/2",
    // (3,6)
    "subR:3/6-1/3",  "subR:6/6-2/3",
    // (3,9)
    "subR:4/9-1/3",  "subR:9/9-2/3",
    // (3,12)
    "subR:5/12-1/3", "subR:12/12-2/3",
    // (4,8)
    "subR:3/8-1/4",  "subR:8/8-3/4",
    // (4,12)
    "subR:4/12-1/4", "subR:12/12-3/4",
    // (5,10)
    "subR:3/10-1/5", "subR:10/10-4/5",
    // (6,12)
    "subR:3/12-1/6", "subR:12/12-5/6",
  ];

  A4_KEYS.forEach(key => {
    const m = key.match(/subR:(\d+)\/(\d+)-(\d+)\/(\d+)/);
    const [n1, d2, n2, d1] = [+m[1], +m[2], +m[3], +m[4]];
    const lcd = d2;
    const rn = n1 - n2 * (lcd / d1);
    const [sn, sd] = simplify(rn, lcd);
    items.push({
      itemKey: key, skill: "A4", group: "addSubtract",
      answerType: "fractionInput",
      a: { n: n1, d: d2 }, b: { n: n2, d: d1 },
      lcd,
      isSubtract: true,
      correctAnswer: `${rn}/${lcd}`,
      altAnswer: (sn === rn && sd === lcd) ? null : `${sn}/${sd}`,
      questionText: `${n1}/${d2} − ${n2}/${d1} = ?`,
    });
  });

  return items;
}

// ---------------------------------------------------------------------------
// Distractor builders
// ---------------------------------------------------------------------------

function buildF1Distractors(n, d) {
  const distractors = [];
  // Inverted fraction
  if (d !== n) distractors.push(`${d}/${n}`);
  // Parts unshaded
  const unshaded = d - n;
  if (unshaded !== n) distractors.push(`${unshaded}/${d}`);
  // Plus-one error
  distractors.push(`${n + 1}/${d + 1}`);
  // Extra if not enough
  if (distractors.length < 3) distractors.push(`${n}/${d + 1}`);
  return [...new Set(distractors.filter(s => s !== `${n}/${d}`))].slice(0, 3);
}

function buildE1Distractors(bn, bd, nd, dd, mult) {
  const distractors = [];
  // Add-everything error: (bn+1)/(bd+1)
  distractors.push(`${bn + 1}/${bd + 1}`);
  // Wrong multiplier: n×(mult+1), d same
  distractors.push(`${bn * (mult + 1)}/${bd * mult}`);
  // Inverted
  distractors.push(`${dd}/${nd}`);
  return [...new Set(distractors.filter(s => s !== `${nd}/${dd}`))].slice(0, 3);
}

function buildE4Distractors(n, d) {
  const distractors = [];
  // Inverted
  if (d !== n) distractors.push(`${d}/${n}`);
  // Unshaded
  const u = d - n;
  if (u !== n) distractors.push(`${u}/${d}`);
  // Adjacent tick
  const adj = n + 1 < d ? `${n + 1}/${d}` : `${n - 1}/${d}`;
  distractors.push(adj);
  if (distractors.length < 3) distractors.push(`${n}/${d + 2}`);
  return [...new Set(distractors.filter(s => s !== `${n}/${d}`))].slice(0, 3);
}

function buildC1Pairs() {
  const pairs = [];
  // Related denominator pairs
  const related = [[2,4],[2,6],[2,8],[3,6],[3,9],[4,8],[4,12],[6,12],[2,10],[3,12],[5,10]];
  related.forEach(([d1, d2]) => {
    for (let n1 = 1; n1 < d1; n1++) {
      for (let n2 = 1; n2 < d2; n2++) {
        // Convert to common denom for comparison
        const lcd = d2;
        const v1 = n1 * (lcd / d1);
        const v2 = n2;
        let answer;
        if (v1 > v2) answer = "left";
        else if (v2 > v1) answer = "right";
        else answer = "equal";
        const key = `cmp:${n1}/${d1},${n2}/${d2}`;
        pairs.push({ a: { n: n1, d: d1 }, b: { n: n2, d: d2 }, answer });
        if (pairs.length >= 28) return;
      }
      if (pairs.length >= 28) return;
    }
  });
  return pairs.slice(0, 28);
}

function buildC2Triples() {
  const triples = [];

  // All-unit fractions
  const unitDenoms = [2,3,4,5,6,8];
  for (let i = 0; i < unitDenoms.length - 2; i++) {
    const [a, b, c] = [unitDenoms[i], unitDenoms[i+1], unitDenoms[i+2]];
    // Order: 1/a > 1/b > 1/c  → asc means smallest first = 1/c, 1/b, 1/a
    triples.push({
      fracs: [{ n: 1, d: a }, { n: 1, d: b }, { n: 1, d: c }],
      order: [2, 1, 0], // indices in sorted ascending order
      direction: "asc",
    });
    if (triples.length >= 14) return triples;
  }

  // Related fractions (halves family)
  [
    [{ n:1,d:2 }, { n:3,d:4 }, { n:5,d:8 }],
    [{ n:1,d:3 }, { n:2,d:6 }, { n:5,d:6 }],
    [{ n:1,d:4 }, { n:3,d:8 }, { n:5,d:8 }],
    [{ n:1,d:2 }, { n:1,d:3 }, { n:2,d:3 }],
    [{ n:2,d:3 }, { n:3,d:4 }, { n:5,d:6 }],
    [{ n:1,d:6 }, { n:1,d:4 }, { n:1,d:3 }],
    [{ n:3,d:4 }, { n:2,d:3 }, { n:5,d:12 }],
    [{ n:1,d:2 }, { n:2,d:5 }, { n:3,d:10 }],
  ].forEach(fracs => {
    if (triples.length >= 14) return;
    // Sort ascending by value
    const sorted = [...fracs].sort((a, b) => a.n / a.d - b.n / b.d);
    const order = fracs.map(f => sorted.findIndex(s => s.n === f.n && s.d === f.d));
    triples.push({ fracs, order, direction: "asc" });
  });

  return triples.slice(0, 14);
}

// ---------------------------------------------------------------------------
// The pool (built once, exported for use in practice screen)
// ---------------------------------------------------------------------------
export const FRACTION_POOL = buildFractionPool();

// ---------------------------------------------------------------------------
// Skill gate: within Group A, don't introduce A3/A4 until 60% of A1+A2 mastered
// ---------------------------------------------------------------------------
export function shouldAllowSkill(skill, masteryData) {
  if (!["A3", "A4"].includes(skill)) return true;
  const a1a2 = FRACTION_POOL.filter(i => i.skill === "A1" || i.skill === "A2");
  if (a1a2.length === 0) return true;
  const mastered = a1a2.filter(i => (masteryData[i.itemKey]?.correct || 0) >= 3).length;
  return mastered / a1a2.length >= 0.6;
}

// ---------------------------------------------------------------------------
// Achievement triggers specific to fractions
// ---------------------------------------------------------------------------
function checkGroupMastered(groupId, masteryData) {
  const groupItems = FRACTION_POOL.filter(i => i.group === groupId);
  return groupItems.length > 0 && groupItems.every(i => (masteryData[i.itemKey]?.correct || 0) >= 3);
}

function checkAllMastered(masteryData) {
  return FRACTION_POOL.every(i => (masteryData[i.itemKey]?.correct || 0) >= 3);
}

function checkRelatedFractionCount(masteryData, targetCount) {
  let count = 0;
  for (const [key, rec] of Object.entries(masteryData)) {
    if ((key.startsWith("addR:") || key.startsWith("subR:")) && (rec?.correct || 0) >= 1) {
      count++;
    }
  }
  return count >= targetCount;
}

// Achievement engine trigger adapters
function checkFractionTrigger(triggerType, params, values) {
  const mastery = values.mastery || {};
  switch (triggerType) {
    case "masterFracGroup":
      return checkGroupMastered(params.group, mastery);
    case "masterAllFractions":
      return checkAllMastered(mastery);
    case "relatedFractionCount":
      return checkRelatedFractionCount(mastery, params.count);
    default:
      return false;
  }
}

// We attach this as module.checkExtraTrigger so achievementEngine can call it
export function checkExtraFractionTrigger(triggerType, params, values) {
  return checkFractionTrigger(triggerType, params, values);
}

// ---------------------------------------------------------------------------
// Module definition
// ---------------------------------------------------------------------------
const fractionsModule = {
  id: "fractions",
  name: "Fractions",
  grades: "Grades 2–4",
  color: COLORS.purple, // #B388FF
  description: "Equal parts, equivalent fractions, comparing, and adding & subtracting — denominators up to 12",

  groups: [
    {
      id: "foundations",
      label: "Foundations",
      skills: ["F1","F2","F3","F4"],
      color: COLORS.purple,
    },
    {
      id: "equivalent",
      label: "Equivalent Fractions",
      skills: ["E1","E2","E3","E4"],
      color: COLORS.blue,
    },
    {
      id: "compare",
      label: "Compare & Order",
      skills: ["C1","C2"],
      color: COLORS.orange,
    },
    {
      id: "addSubtract",
      label: "Add & Subtract",
      skills: ["A1","A2","A3","A4"],
      color: COLORS.green,
    },
  ],

  freeContent: ["foundations"],

  // Skill focus labels in kid-friendly language
  skillLabels: {
    F1: "Name it!",
    F2: "Shade it!",
    F3: "Bigger piece?",
    F4: "More pieces?",
    E1: "Find the match!",
    E2: "Missing number",
    E3: "Simplest form",
    E4: "On the line",
    C1: "Which is more?",
    C2: "Put them in order",
    A1: "Add the parts",
    A2: "Take some away",
    A3: "Add with renaming",
    A4: "Subtract with renaming",
  },

  // Pool reference (the practice screen uses this)
  pool: FRACTION_POOL,

  // Scaffold map: skill prefix → component tag (resolved by practice screen)
  scaffoldMap: {
    F1: "FractionBar",
    F2: "FractionBar",
    F3: "TwoStackedBars",
    F4: "TwoStackedBars",
    E1: "TwoStackedBars",
    E2: "TwoStackedBars",
    E3: "TwoStackedBars",
    E3_simplify: "TwoStackedBars",
    E4: "NumberLine",
    C1: "TwoStackedBars",
    C2: "TwoStackedBars",
    A1: "AddBars",
    A2: "AddBars",
    A3: "AddBars",
    A4: "AddBars",
  },

  // Default CPA mode for new profiles: concrete for foundations, pictorial elsewhere
  defaultMode: "pictorial",
  defaultModeByGroup: { foundations: "concrete" },

  achievements: [
    // Skill badges
    { id: "frac-equal-parts-expert", name: "Equal-Parts Expert", trigger: "masterFracGroup", params: { group: "foundations" } },
    { id: "frac-match-maker", name: "Match Maker", trigger: "masterFracGroup", params: { group: "equivalent" } },
    { id: "frac-fair-judge", name: "Fair Judge", trigger: "masterFracGroup", params: { group: "compare" } },
    { id: "frac-piece-keeper", name: "Piece Keeper", trigger: "masterFracGroup", params: { group: "addSubtract" } },
    // Module mastery
    { id: "frac-master", name: "Fraction Master", trigger: "masterAllFractions" },
    // Counter badge
    { id: "frac-renamer-pro", name: "Renamer Pro", trigger: "relatedFractionCount", params: { count: 50 } },
  ],

  // Extra trigger checker (fractions-specific achievement triggers)
  checkExtraTrigger: checkExtraFractionTrigger,
};

export default fractionsModule;
