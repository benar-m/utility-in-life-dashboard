import { useEffect, useState } from "react";
import { STATUS, SURFACE } from "./palette.js";
import useChartFrame from "./useChartFrame.js";

const TAU = Math.PI * 2;
const TRACK = "#EEF2F6";

// 0 → 1 once the chart scrolls into view (ease-out), or straight to 1 for reduced motion.
function useSweep(isRevealed, reduceMotion, duration = 950) {
  const [progress, setProgress] = useState(reduceMotion ? 1 : 0);
  useEffect(() => {
    if (!isRevealed) return undefined;
    if (reduceMotion) {
      setProgress(1);
      return undefined;
    }
    let frame;
    const started = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - started) / duration);
      setProgress(1 - (1 - t) ** 3);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isRevealed, reduceMotion, duration]);
  return progress;
}

const point = (cx, cy, r, angle) => [cx + r * Math.cos(angle), cy + r * Math.sin(angle)];

// A ring segment (inner > 0) or a pie wedge (inner = 0) between two angles.
function sectorPath(cx, cy, inner, outer, start, end) {
  if (end - start >= TAU - 1e-6) {
    // A full circle can't be one arc; draw it as two halves.
    const mid = start + Math.PI;
    return sectorPath(cx, cy, inner, outer, start, mid) + sectorPath(cx, cy, inner, outer, mid, end);
  }
  const large = end - start > Math.PI ? 1 : 0;
  const [x0, y0] = point(cx, cy, outer, start);
  const [x1, y1] = point(cx, cy, outer, end);
  if (inner <= 0) return `M${cx},${cy}L${x0},${y0}A${outer},${outer} 0 ${large} 1 ${x1},${y1}Z`;
  const [x2, y2] = point(cx, cy, inner, end);
  const [x3, y3] = point(cx, cy, inner, start);
  return `M${x0},${y0}A${outer},${outer} 0 ${large} 1 ${x1},${y1}L${x2},${y2}A${inner},${inner} 0 ${large} 0 ${x3},${y3}Z`;
}

const share = (value, total) => (total ? Math.round((value / total) * 100) : 0);

/**
 * Part-to-whole in the round. Variants:
 *   "donut" – ring with a headline in the hole;
 *   "pie"   – full wedges with the share printed inside big slices;
 *   "half"  – a semicircle gauge with the headline under the arch.
 * parts: [{ label, value, color }]. Slices are separated by a 2px surface gap; hovering a
 * slice (or its legend row) lifts it and shows its numbers. The legend always lists every
 * part with value and share, so colour never carries meaning alone.
 */
export function DonutChart({
  parts,
  variant = "donut",
  format = String,
  centerValue,
  centerLabel,
  size = 200,
  emptyLabel = "Nothing to show yet",
}) {
  const { ref, isRevealed, reduceMotion } = useChartFrame();
  const progress = useSweep(isRevealed, reduceMotion);
  const [hovered, setHovered] = useState(null);

  const visible = parts.filter((part) => part.value > 0);
  const total = visible.reduce((sum, part) => sum + part.value, 0);
  if (!total) return <p className="py-10 text-center text-sm text-slate-400">{emptyLabel}</p>;

  const isHalf = variant === "half";
  const outer = size / 2 - 6; // room for the hover lift
  const inner = variant === "pie" ? 0 : outer * (isHalf ? 0.66 : 0.72);
  const cx = size / 2;
  const cy = isHalf ? outer + 6 : size / 2;
  const height = isHalf ? outer + 12 : size;
  const span = (isHalf ? Math.PI : TAU) * progress;
  const origin = isHalf ? Math.PI : -Math.PI / 2;

  let cursor = origin;
  const slices = visible.map((part) => {
    const start = cursor;
    const end = start + (part.value / total) * span;
    cursor = end;
    return { ...part, start, end, mid: (start + end) / 2 };
  });

  const active = slices.find((slice) => slice.label === hovered);
  const headline = active
    ? { value: format(active.value), label: `${active.label} · ${share(active.value, total)}%` }
    : { value: centerValue, label: centerLabel };

  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-x-8 gap-y-5">
      <div className="relative shrink-0" style={{ width: size, height }}>
        <svg
          width={size}
          height={height}
          role="img"
          aria-label={visible.map((part) => `${part.label} ${format(part.value)} (${share(part.value, total)}%)`).join(", ")}
          className="overflow-visible"
        >
          {isHalf && <path d={sectorPath(cx, cy, inner, outer, Math.PI, TAU)} fill={TRACK} />}
          {slices.map((slice) => {
            const lifted = hovered === slice.label;
            const [dx, dy] = lifted ? point(0, 0, 5, slice.mid) : [0, 0];
            return (
              <path
                key={slice.label}
                d={sectorPath(cx, cy, inner, outer, slice.start, slice.end)}
                fill={slice.color}
                stroke={SURFACE}
                strokeWidth="2"
                strokeLinejoin="round"
                tabIndex={0}
                aria-label={`${slice.label}: ${format(slice.value)}, ${share(slice.value, total)}%`}
                onPointerEnter={() => setHovered(slice.label)}
                onPointerLeave={() => setHovered(null)}
                onFocus={() => setHovered(slice.label)}
                onBlur={() => setHovered(null)}
                className="cursor-pointer outline-none"
                style={{
                  transform: `translate(${dx}px, ${dy}px)`,
                  opacity: hovered && !lifted ? 0.55 : 1,
                  transition: "transform .2s ease, opacity .2s ease",
                }}
              />
            );
          })}
          {variant === "pie" &&
            progress === 1 &&
            slices.map((slice) => {
              if (slice.value / total < 0.1) return null;
              const [x, y] = point(cx, cy, outer * 0.62, slice.mid);
              return (
                <text key={slice.label} x={x} y={y} dy="0.35em" textAnchor="middle" pointerEvents="none" className="fill-white text-[13px] font-bold tabular-nums">
                  {share(slice.value, total)}%
                </text>
              );
            })}
        </svg>

        {variant !== "pie" && headline.value !== undefined && (
          <div
            className={`pointer-events-none absolute inset-x-0 flex flex-col items-center text-center ${isHalf ? "bottom-0" : "inset-y-0 justify-center"}`}
          >
            <span className="font-display text-lg font-extrabold leading-tight tabular-nums text-shuleni-navy">{headline.value}</span>
            <span className="truncate text-xs text-slate-500" style={{ maxWidth: inner * 1.6 }}>{headline.label}</span>
          </div>
        )}
      </div>

      <ul className="min-w-[15rem] flex-1 space-y-1.5 text-sm">
        {parts.map((part) => (
          <li
            key={part.label}
            onPointerEnter={() => part.value > 0 && setHovered(part.label)}
            onPointerLeave={() => setHovered(null)}
            className={`flex items-center gap-2.5 rounded-lg px-2 py-1 transition ${hovered === part.label ? "bg-slate-50" : ""} ${hovered && hovered !== part.label ? "opacity-50" : ""}`}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: part.color }} />
            <span className="min-w-0 flex-1 truncate text-slate-600">{part.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{format(part.value)}</span>
            <span className="w-10 text-right text-xs tabular-nums text-slate-400">{share(part.value, total)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * One rate out of 100 as a ring: grey track, coloured arc with a rounded end, the number in
 * the middle. Meant to be used as small multiples (one per class).
 */
export function RingGauge({ value, color = STATUS.good, size = 104, stroke = 10, children, caption }) {
  const { ref, isRevealed, reduceMotion } = useChartFrame();
  const progress = useSweep(isRevealed, reduceMotion, 1100);
  const radius = (size - stroke) / 2;
  const circumference = TAU * radius;
  const filled = value === null || value === undefined ? 0 : (Math.min(value, 100) / 100) * progress;

  return (
    <figure ref={ref} className="flex flex-col items-center text-center">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={TRACK} strokeWidth={stroke} />
          {filled > 0 && (
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={stroke}
              strokeLinecap="round"
              strokeDasharray={`${filled * circumference} ${circumference}`}
            />
          )}
        </svg>
        <span className="absolute inset-0 flex items-center justify-center font-display text-xl font-extrabold tabular-nums text-shuleni-navy">
          {value === null || value === undefined ? "—" : `${Math.round(value * progress)}%`}
        </span>
      </div>
      <figcaption className="mt-2 w-full min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800">{children}</span>
        {caption && <span className="block text-xs text-slate-500">{caption}</span>}
      </figcaption>
    </figure>
  );
}
