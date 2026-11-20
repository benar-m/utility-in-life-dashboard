import { useState } from "react";
import { GRID, PRIMARY } from "./palette.js";
import useChartFrame, { compactNumber, niceTicks } from "./useChartFrame.js";

const PAD = { top: 18, right: 8, bottom: 26, left: 44 };

// Column with a 4px rounded data-end and a square baseline.
function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  if (h <= 0) return "";
  return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
}

/** data: [{ [xKey], [valueKey] }]. Single series; the title names it, so no legend. */
export default function ColumnChart({ data, xKey, valueKey, color = PRIMARY, xFormat = String, yFormat = compactNumber, height = 220, emptyLabel = "No data in this range" }) {
  const { ref, width, isRevealed, reduceMotion } = useChartFrame();
  const [hoverIndex, setHoverIndex] = useState(null);

  const values = data.map((row) => Number(row[valueKey]) || 0);
  const max = Math.max(...values, 0);
  const ticks = niceTicks(max);
  const top = ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;
  const slot = innerW / Math.max(data.length, 1);
  const barW = Math.min(24, Math.max(3, slot * 0.6));
  const y = (value) => PAD.top + innerH - (value / top) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 64))));
  const peak = values.indexOf(max);
  const hovered = hoverIndex !== null ? data[hoverIndex] : null;

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label="Column chart" className="overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                {yFormat(tick)}
              </text>
            </g>
          ))}
          {data.map((row, index) => {
            const value = values[index];
            const cx = PAD.left + slot * index + slot / 2;
            const barH = (value / top) * innerH;
            const dimmed = hoverIndex !== null && hoverIndex !== index;
            return (
              <g key={index}>
                <path
                  d={columnPath(cx - barW / 2, y(value), barW, barH)}
                  fill={color}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom",
                    transform: isRevealed ? "scaleY(1)" : "scaleY(0)",
                    opacity: dimmed ? 0.45 : 1,
                    transition: reduceMotion
                      ? "opacity .15s"
                      : `transform .7s cubic-bezier(.22,1,.36,1) ${Math.min(index * 30, 600)}ms, opacity .15s`,
                  }}
                />
                {index === peak && value > 0 && (
                  <text
                    x={cx}
                    y={y(value) - 6}
                    textAnchor="middle"
                    className="fill-slate-700 text-[11px] font-semibold tabular-nums"
                    style={{ opacity: isRevealed ? 1 : 0, transition: reduceMotion ? "none" : "opacity .4s ease .6s" }}
                  >
                    {yFormat(value)}
                  </text>
                )}
                {index % labelEvery === 0 && (
                  <text x={cx} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">
                    {xFormat(row[xKey])}
                  </text>
                )}
                <rect
                  x={PAD.left + slot * index}
                  y={PAD.top}
                  width={slot}
                  height={innerH}
                  fill="transparent"
                  tabIndex={0}
                  aria-label={`${xFormat(row[xKey], true)}: ${yFormat(value, true)}`}
                  onPointerEnter={() => setHoverIndex(index)}
                  onPointerLeave={() => setHoverIndex(null)}
                  onFocus={() => setHoverIndex(index)}
                  onBlur={() => setHoverIndex(null)}
                  className="outline-none"
                />
              </g>
            );
          })}
          <line x1={PAD.left} x2={width - PAD.right} y1={y(0)} y2={y(0)} stroke="#CBD5E1" strokeWidth="1" />
        </svg>
      )}
      {max === 0 && width > 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">{emptyLabel}</p>
      )}
      {hovered && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: Math.min(Math.max(PAD.left + slot * hoverIndex + slot / 2 - 60, 0), width - 140) }}
        >
          <p className="font-semibold tabular-nums text-slate-900">{yFormat(values[hoverIndex], true)}</p>
          <p className="text-slate-500">{xFormat(hovered[xKey], true)}</p>
        </div>
      )}
    </div>
  );
}
