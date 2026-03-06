import { useMemo } from "react";
import { cn } from "../../utils/cn";
import type { TrafficPoint } from "../../types/nids";

export function Sparkline({
  points,
  valueKey,
  className,
}: {
  points: TrafficPoint[];
  valueKey: "bps" | "pps";
  className?: string;
}) {
  const d = useMemo(() => {
    if (!points.length) return null;
    const w = 240;
    const h = 44;
    const pad = 3;
    const xs = points.map((_, i) => (i / (points.length - 1)) * (w - pad * 2) + pad);
    const vals = points.map((p) => p[valueKey]);
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const rng = Math.max(1, max - min);
    const ys = vals.map((v) => {
      const t = (v - min) / rng;
      return h - (t * (h - pad * 2) + pad);
    });
    let path = `M ${xs[0].toFixed(2)} ${ys[0].toFixed(2)}`;
    for (let i = 1; i < xs.length; i++) {
      path += ` L ${xs[i].toFixed(2)} ${ys[i].toFixed(2)}`;
    }
    return { path, w, h };
  }, [points, valueKey]);

  if (!d) return null;

  return (
    <div className={cn("w-full", className)}>
      <svg viewBox={`0 0 ${d.w} ${d.h}`} className="h-11 w-full">
        <defs>
          <linearGradient id={`g-${valueKey}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor="rgb(34 211 238)" stopOpacity="0.65" />
            <stop offset="1" stopColor="rgb(99 102 241)" stopOpacity="0.65" />
          </linearGradient>
        </defs>
        <path d={d.path} fill="none" stroke={`url(#g-${valueKey})`} strokeWidth="2" />
      </svg>
    </div>
  );
}
