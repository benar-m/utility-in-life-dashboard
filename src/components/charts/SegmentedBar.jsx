import { useState } from "react";
import useChartFrame from "./useChartFrame.js";

/**
 * One whole split into parts (e.g. attendance by status, payments by method).
 * Tall bar (28px): each part its own block with 4px corners and a 2px surface gap; a share
 * prints inside only when the block is wide enough. The legend names the parts in order.
 * parts: [{ label, value, color, textColor? }]
 */
export default function SegmentedBar({ parts, format = String, emptyLabel = "Nothing recorded yet" }) {
  const { ref, isRevealed, reduceMotion } = useChartFrame();
  const [hovered, setHovered] = useState(null);
  const total = parts.reduce((sum, part) => sum + (part.value || 0), 0);

  if (!total) return <p className="py-6 text-center text-sm text-slate-400">{emptyLabel}</p>;

  const visible = parts.filter((part) => part.value > 0);
  return (
    <div ref={ref}>
      <div
        className="flex h-7 gap-0.5"
        role="img"
        aria-label={visible.map((part) => `${part.label} ${format(part.value)} (${Math.round((part.value / total) * 100)}%)`).join(", ")}
      >
        {visible.map((part, index) => {
          const share = (part.value / total) * 100;
          return (
            <div
              key={part.label}
              tabIndex={0}
              onPointerEnter={() => setHovered(part.label)}
              onPointerLeave={() => setHovered(null)}
              onFocus={() => setHovered(part.label)}
              onBlur={() => setHovered(null)}
              className="relative flex min-w-[2px] items-center overflow-hidden rounded outline-none"
              style={{
                width: isRevealed ? `${share}%` : "0%",
                background: part.color,
                opacity: hovered && hovered !== part.label ? 0.5 : 1,
                transition: reduceMotion ? "opacity .15s" : `width .8s cubic-bezier(.22,1,.36,1) ${index * 80}ms, opacity .15s`,
              }}
            >
              {share >= 12 && (
                <span className="px-2 text-xs font-semibold tabular-nums" style={{ color: part.textColor || "#fff" }}>
                  {Math.round(share)}%
                </span>
              )}
            </div>
          );
        })}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
        {parts.map((part) => (
          <li
            key={part.label}
            className={`flex items-center gap-2 transition ${hovered && hovered !== part.label ? "opacity-50" : ""}`}
          >
            <span aria-hidden="true" className="h-2.5 w-2.5 rounded-sm" style={{ background: part.color }} />
            <span className="text-slate-600">{part.label}</span>
            <span className="font-semibold tabular-nums text-slate-900">{format(part.value)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
