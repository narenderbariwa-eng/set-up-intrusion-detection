import type { Severity } from "../../types/nids";
import { cn } from "../../utils/cn";

export function SeverityPill({ severity }: { severity: Severity }) {
  const map: Record<Severity, string> = {
    Low: "border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    Medium: "border-amber-400/30 bg-amber-400/10 text-amber-200",
    High: "border-orange-400/30 bg-orange-400/10 text-orange-200",
    Critical: "border-rose-400/30 bg-rose-400/10 text-rose-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold",
        map[severity]
      )}
    >
      {severity}
    </span>
  );
}
