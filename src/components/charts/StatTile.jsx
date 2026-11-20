import { useEffect, useState } from "react";
import { PRIMARY } from "./palette.js";
import useChartFrame from "./useChartFrame.js";

// Counts up to a number once it scrolls into view (instant with reduced motion).
export function CountUp({ value, format = (n) => Math.round(n).toLocaleString("en-KE") }) {
  const { ref, isRevealed, reduceMotion } = useChartFrame();
  const [shown, setShown] = useState(reduceMotion ? value : 0);

  useEffect(() => {
    if (!isRevealed || typeof value !== "number") return undefined;
    if (reduceMotion) return setShown(value);
    let frame;
    const started = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - started) / 900, 1);
      setShown(value * (1 - (1 - progress) ** 3));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [isRevealed, reduceMotion, value]);

  return <span ref={ref}>{typeof value === "number" ? format(shown) : value}</span>;
}

export function Sparkline({ values, color = PRIMARY, height = 36 }) {
  const { ref, width, isRevealed, reduceMotion } = useChartFrame();
  const points = values.map((value, index) => ({ index, value })).filter((point) => point.value !== null);
  if (points.length < 2) return <div ref={ref} style={{ height }} />;
  const max = Math.max(...points.map((p) => p.value), 1);
  const x = (index) => 2 + (index / (values.length - 1)) * (width - 6);
  const y = (value) => 3 + (height - 6) * (1 - value / max);
  const d = `M${points.map((p) => `${x(p.index)},${y(p.value)}`).join("L")}`;
  const last = points[points.length - 1];
  return (
    <div ref={ref} style={{ height }} aria-hidden="true">
      {width > 0 && (
        <svg width={width} height={height} className="overflow-visible">
          <path
            d={d}
            fill="none"
            stroke={color}
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            pathLength="1"
            strokeDasharray="1"
            style={{ strokeDashoffset: isRevealed ? 0 : 1, transition: reduceMotion ? "none" : "stroke-dashoffset 1s ease-out" }}
          />
          <circle cx={x(last.index)} cy={y(last.value)} r="3.5" fill={color} stroke="#fff" strokeWidth="2" />
        </svg>
      )}
    </div>
  );
}

/** label · value · hint, with an optional icon and sparkline. */
export default function StatTile({ label, value, format, hint, icon: Icon, trend, tone = "brand" }) {
  const tones = {
    brand: "bg-shuleni-aqua text-shuleni-teal",
    amber: "bg-amber-50 text-amber-600",
    red: "bg-red-50 text-red-600",
    slate: "bg-slate-100 text-slate-600",
  };
  // Long values (e.g. "KES 120,500") step down a size so they stay on one line in narrow tiles.
  const display = typeof value === "number" && format ? format(value) : String(value);
  return (
    <div className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        {Icon && (
          <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tones[tone]}`}>
            <Icon size={18} aria-hidden="true" />
          </span>
        )}
      </div>
      <p className={`mt-3 whitespace-nowrap font-display font-extrabold text-shuleni-navy ${display.length > 9 ? "text-2xl" : "text-3xl"}`}>
        <CountUp value={value} format={format} />
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500">{hint}</p>}
      {trend && <div className="mt-3"><Sparkline values={trend} /></div>}
    </div>
  );
}
