import { useState } from "react";
import { GRID, SURFACE } from "./palette.js";
import useChartFrame, { compactNumber, niceTicks } from "./useChartFrame.js";

const PAD = { top: 12, right: 16, bottom: 26, left: 40 };

// Split a series into runs of consecutive non-null points (null = a gap, e.g. no lessons).
function runs(points) {
  const result = [];
  let current = [];
  points.forEach((point) => {
    if (point.y === null || point.y === undefined) {
      if (current.length) result.push(current);
      current = [];
    } else current.push(point);
  });
  if (current.length) result.push(current);
  return result;
}

/**
 * series: [{ key, label, color }]; data: [{ [xKey]: ..., [series.key]: number|null }]
 * One y-axis only. Gaps where values are null.
 */
export default function LineChart({ data, xKey, series, xFormat = String, yFormat = compactNumber, yMax, height = 220, emptyLabel = "No data in this range" }) {
  const { ref, width, isRevealed, reduceMotion } = useChartFrame();
  const [hoverIndex, setHoverIndex] = useState(null);

  const values = data.flatMap((row) => series.map((s) => row[s.key])).filter((v) => v !== null && v !== undefined);
  const hasData = values.length > 0;
  const ticks = niceTicks(yMax ?? Math.max(...values, 0));
  const top = yMax ?? ticks[ticks.length - 1];
  const innerW = Math.max(width - PAD.left - PAD.right, 10);
  const innerH = height - PAD.top - PAD.bottom;
  const x = (index) => PAD.left + (data.length <= 1 ? innerW / 2 : (index / (data.length - 1)) * innerW);
  const y = (value) => PAD.top + innerH - (value / top) * innerH;
  const labelEvery = Math.max(1, Math.ceil(data.length / Math.max(2, Math.floor(innerW / 70))));

  const handleMove = (event) => {
    const box = event.currentTarget.getBoundingClientRect();
    const relative = event.clientX - box.left - PAD.left;
    const index = Math.round((relative / innerW) * (data.length - 1));
    setHoverIndex(Math.min(data.length - 1, Math.max(0, index)));
  };

  const hovered = hoverIndex !== null ? data[hoverIndex] : null;
  const transition = reduceMotion ? "none" : "stroke-dashoffset 1.1s cubic-bezier(.22,1,.36,1), opacity .8s ease";

  return (
    <div ref={ref} className="relative w-full" style={{ height }}>
      {width > 0 && (
        <svg width={width} height={height} role="img" aria-label={series.map((s) => s.label).join(", ")} className="overflow-visible">
          {ticks.map((tick) => (
            <g key={tick}>
              <line x1={PAD.left} x2={width - PAD.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth="1" />
              <text x={PAD.left - 8} y={y(tick)} dy="0.32em" textAnchor="end" className="fill-slate-400 text-[11px] tabular-nums">
                {yFormat(tick)}
              </text>
            </g>
          ))}
          {data.map((row, index) =>
            index % labelEvery === 0 ? (
              <text key={index} x={x(index)} y={height - 6} textAnchor="middle" className="fill-slate-400 text-[11px]">
                {xFormat(row[xKey])}
              </text>
            ) : null
          )}

          {hasData &&
            series.map((s) => {
              const points = data.map((row, index) => ({ x: x(index), y: row[s.key] === null || row[s.key] === undefined ? null : y(row[s.key]) }));
              const segments = runs(points);
              const last = [...points].reverse().find((point) => point.y !== null);
              return (
                <g key={s.key}>
                  {segments.map((segment, i) =>
                    segment.length > 1 ? (
                      <g key={i}>
                        <path
                          d={`M${segment.map((p) => `${p.x},${p.y}`).join("L")}L${segment[segment.length - 1].x},${y(0)}L${segment[0].x},${y(0)}Z`}
                          fill={s.color}
                          style={{ opacity: isRevealed ? 0.1 : 0, transition }}
                        />
                        <path
                          d={`M${segment.map((p) => `${p.x},${p.y}`).join("L")}`}
                          fill="none"
                          stroke={s.color}
                          strokeWidth="2"
                          strokeLinejoin="round"
                          strokeLinecap="round"
                          pathLength="1"
                          strokeDasharray="1"
                          style={{ strokeDashoffset: isRevealed ? 0 : 1, transition }}
                        />
                      </g>
                    ) : (
                      <circle key={i} cx={segment[0].x} cy={segment[0].y} r="4" fill={s.color} stroke={SURFACE} strokeWidth="2" style={{ opacity: isRevealed ? 1 : 0, transition }} />
                    )
                  )}
                  {last && <circle cx={last.x} cy={last.y} r="4" fill={s.color} stroke={SURFACE} strokeWidth="2" style={{ opacity: isRevealed ? 1 : 0, transition }} />}
                </g>
              );
            })}

          {hovered && (
            <g pointerEvents="none">
              <line x1={x(hoverIndex)} x2={x(hoverIndex)} y1={PAD.top} y2={PAD.top + innerH} stroke="#94A3B8" strokeWidth="1" />
              {series.map((s) =>
                hovered[s.key] === null || hovered[s.key] === undefined ? null : (
                  <circle key={s.key} cx={x(hoverIndex)} cy={y(hovered[s.key])} r="4.5" fill={s.color} stroke={SURFACE} strokeWidth="2" />
                )
              )}
            </g>
          )}
          <rect
            x={PAD.left}
            y={PAD.top}
            width={innerW}
            height={innerH}
            fill="transparent"
            onPointerMove={handleMove}
            onPointerLeave={() => setHoverIndex(null)}
          />
        </svg>
      )}

      {!hasData && width > 0 && (
        <p className="absolute inset-0 flex items-center justify-center text-sm text-slate-400">{emptyLabel}</p>
      )}

      {hovered && (
        <div
          role="status"
          className="pointer-events-none absolute top-0 z-10 min-w-[9rem] rounded-xl border border-slate-200 bg-white/95 px-3 py-2 text-xs shadow-lg backdrop-blur"
          style={{ left: Math.min(Math.max(x(hoverIndex) + 12, 0), width - 160) }}
        >
          <p className="font-medium text-slate-500">{xFormat(hovered[xKey], true)}</p>
          {series.map((s) => (
            <p key={s.key} className="mt-1 flex items-center gap-2">
              <span aria-hidden="true" className="h-0.5 w-3 rounded-full" style={{ background: s.color }} />
              <span className="font-semibold tabular-nums text-slate-900">
                {hovered[s.key] === null || hovered[s.key] === undefined ? "—" : yFormat(hovered[s.key], true)}
              </span>
              <span className="text-slate-500">{s.label}</span>
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
