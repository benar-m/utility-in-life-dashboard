import { useEffect, useRef, useState } from "react";

const prefersReducedMotion = () =>
  typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

// Measures the chart's width and reports when it first scrolls into view, so marks can
// animate in once (and never for people who prefer reduced motion).
export default function useChartFrame() {
  const ref = useRef(null);
  const [width, setWidth] = useState(0);
  const [isRevealed, setIsRevealed] = useState(prefersReducedMotion());

  useEffect(() => {
    const element = ref.current;
    if (!element) return undefined;
    const resize = new ResizeObserver(([entry]) => setWidth(Math.floor(entry.contentRect.width)));
    resize.observe(element);
    let reveal;
    if (!isRevealed) {
      reveal = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) {
            // Next frame, so the "from" state paints before the transition starts.
            requestAnimationFrame(() => setIsRevealed(true));
            reveal.disconnect();
          }
        },
        { threshold: 0.25 }
      );
      reveal.observe(element);
    }
    return () => {
      resize.disconnect();
      reveal?.disconnect();
    };
  }, [isRevealed]);

  return { ref, width, isRevealed, reduceMotion: prefersReducedMotion() };
}

// Clean axis ticks: 0 and round steps up to a "nice" max.
export function niceTicks(maxValue, count = 4) {
  if (!maxValue || maxValue <= 0) return [0, 1];
  const rough = maxValue / count;
  const magnitude = 10 ** Math.floor(Math.log10(rough));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((s) => s >= rough) || 10 * magnitude;
  const ticks = [];
  for (let value = 0; value <= maxValue + step * 0.001; value += step) ticks.push(Number(value.toFixed(6)));
  if (ticks[ticks.length - 1] < maxValue) ticks.push(ticks[ticks.length - 1] + step);
  return ticks;
}

export function compactNumber(value) {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${Math.round(value / 1000)}K`;
  return Math.round(value).toLocaleString("en-KE");
}
