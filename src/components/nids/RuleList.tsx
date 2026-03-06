import type { Rule } from "../../types/nids";
import { cn } from "../../utils/cn";
import { Badge } from "../ui/Badge";
import { Button } from "../ui/Button";
import { formatDateTime } from "../../utils/format";

export function RuleList({
  rules,
  onToggle,
}: {
  rules: Rule[];
  onToggle: (id: string) => void;
}) {
  return (
    <div className="space-y-2">
      {rules.map((r) => (
        <div
          key={r.id}
          className={cn(
            "rounded-xl border border-white/10 bg-white/5 p-3",
            r.enabled ? "" : "opacity-70"
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <div className="truncate text-sm font-semibold text-slate-100">{r.name}</div>
                <Badge className="text-[11px]">{r.id}</Badge>
              </div>
              <div className="mt-1 text-xs text-slate-300/80">
                <span className="text-slate-200">Match:</span> {r.match}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <Badge className="text-[11px]">{r.category}</Badge>
                <Badge className="text-[11px]">Severity: {r.severity}</Badge>
                <Badge className="text-[11px]">Action: {r.action}</Badge>
                <Badge className="text-[11px]">Hits 24h: {r.hits24h}</Badge>
                {r.lastTriggered ? (
                  <Badge className="text-[11px]">Last: {formatDateTime(r.lastTriggered)}</Badge>
                ) : (
                  <Badge className="text-[11px]">Last: —</Badge>
                )}
              </div>
            </div>
            <div className="shrink-0">
              <Button size="sm" variant={r.enabled ? "secondary" : "primary"} onClick={() => onToggle(r.id)}>
                {r.enabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
