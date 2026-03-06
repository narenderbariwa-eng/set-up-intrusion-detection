import type { Alert } from "../../types/nids";
import { cn } from "../../utils/cn";
import { formatTime } from "../../utils/format";
import { SeverityPill } from "./SeverityPill";

export function AlertTable({
  alerts,
  selectedId,
  onSelect,
}: {
  alerts: Alert[];
  selectedId?: string;
  onSelect: (a: Alert) => void;
}) {
  return (
    <div className="overflow-auto">
      <table className="min-w-full border-separate border-spacing-0">
        <thead className="sticky top-0 bg-slate-950/70 backdrop-blur">
          <tr>
            {[
              "Time",
              "Severity",
              "Category",
              "Title",
              "Src",
              "Dst",
              "Proto",
              "Status",
            ].map((h) => (
              <th
                key={h}
                className="border-b border-white/10 px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-slate-300/80"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {alerts.map((a) => {
            const active = a.id === selectedId;
            return (
              <tr
                key={a.id}
                className={cn(
                  "cursor-pointer",
                  active ? "bg-white/10" : "hover:bg-white/5"
                )}
                onClick={() => onSelect(a)}
              >
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {formatTime(a.ts)}
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs">
                  <SeverityPill severity={a.severity} />
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {a.category}
                </td>
                <td className="min-w-[260px] border-b border-white/10 px-3 py-2 text-xs text-slate-100">
                  <div className="font-medium">{a.title}</div>
                  <div className="mt-0.5 text-[11px] text-slate-300/80">
                    Sensor: {a.sensor} · Conf: {a.confidence}%
                  </div>
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {a.srcIp}
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {a.dstIp}
                  {a.dstPort ? <span className="text-slate-300/70">:{a.dstPort}</span> : null}
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {a.protocol}
                </td>
                <td className="whitespace-nowrap border-b border-white/10 px-3 py-2 text-xs text-slate-200">
                  {a.status}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
