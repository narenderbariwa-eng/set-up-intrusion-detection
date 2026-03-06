import { useEffect, useMemo, useRef, useState } from "react";
import type { Alert, AlertStatus, Severity, TrafficPoint } from "./types/nids";
import { seedAlerts, seedRules, seedTraffic } from "./data/nidsSeed";
import { Card, CardBody, CardHeader } from "./components/ui/Card";
import { Button } from "./components/ui/Button";
import { Badge } from "./components/ui/Badge";
import { Drawer } from "./components/ui/Drawer";
import { AlertTable } from "./components/nids/AlertTable";
import { RuleList } from "./components/nids/RuleList";
import { Sparkline } from "./components/nids/Sparkline";
import { formatBps, formatBytes, formatDateTime, formatNumber, formatPps } from "./utils/format";
import { SeverityPill } from "./components/nids/SeverityPill";

type Filters = {
  q: string;
  severity: Severity | "Any";
  status: AlertStatus | "Any";
};

function randomIp(privateOnly = false) {
  const r = (n: number) => Math.floor(Math.random() * n);
  if (privateOnly) return `10.10.${r(10)}.${r(240) + 10}`;
  const choice = Math.random();
  if (choice < 0.45) return `10.10.${r(10)}.${r(240) + 10}`;
  if (choice < 0.7) return `192.0.2.${r(240) + 10}`;
  if (choice < 0.85) return `198.51.100.${r(240) + 10}`;
  return `203.0.113.${r(240) + 10}`;
}

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function mkNewAlert(n: number): Alert {
  const t = Date.now();
  const templates: Array<Omit<Alert, "id" | "ts">> = [
    {
      title: "SYN scan detected",
      category: "Port Scan",
      severity: "High",
      status: "Open",
      srcIp: randomIp(false),
      dstIp: randomIp(true),
      dstPort: pick([22, 80, 443, 3389, 445, 8080]),
      protocol: "TCP",
      sensor: pick(["edge-sensor-1", "edge-sensor-2", "core-tap-2"]),
      confidence: Math.round(70 + Math.random() * 25),
      packets: Math.round(800 + Math.random() * 5000),
      bytes: Math.round(400_000 + Math.random() * 3_000_000),
      fingerprint: "syn.rate",
      notes: "Burst pattern consistent with scanning; consider blocking source at edge.",
    },
    {
      title: "Brute force attempts",
      category: "Brute Force",
      severity: "Critical",
      status: "Open",
      srcIp: randomIp(false),
      dstIp: randomIp(true),
      dstPort: pick([22, 3389, 21, 25]),
      protocol: "TCP",
      sensor: pick(["edge-sensor-1", "core-tap-2"]),
      confidence: Math.round(80 + Math.random() * 18),
      packets: Math.round(600 + Math.random() * 2200),
      bytes: Math.round(900_000 + Math.random() * 2_800_000),
      fingerprint: "auth.fail-burst",
      notes: "High number of authentication failures in short window.",
    },
    {
      title: "Anomalous outbound transfer",
      category: "Data Exfiltration",
      severity: pick(["High", "Critical"]),
      status: "Investigating",
      srcIp: randomIp(true),
      dstIp: randomIp(false),
      dstPort: pick([443, 53, 8443]),
      protocol: pick(["TLS", "UDP", "HTTP"]),
      sensor: "core-tap-2",
      confidence: Math.round(65 + Math.random() * 28),
      packets: Math.round(300 + Math.random() * 1200),
      bytes: Math.round(15_000_000 + Math.random() * 120_000_000),
      fingerprint: "egress.anom",
      notes: "Egress volume deviates from baseline; verify destination reputation.",
    },
    {
      title: "Web attack probe",
      category: "Web Attack",
      severity: pick(["Low", "Medium", "High"]),
      status: "Open",
      srcIp: randomIp(false),
      dstIp: "10.10.2.10",
      dstPort: 443,
      protocol: "HTTP",
      sensor: "edge-sensor-1",
      confidence: Math.round(55 + Math.random() * 30),
      packets: Math.round(40 + Math.random() * 160),
      bytes: Math.round(60_000 + Math.random() * 600_000),
      fingerprint: "http.attack",
      notes: "Suspicious request parameters; inspect HTTP logs and WAF decisions.",
    },
  ];
  const base = pick(templates);
  return { id: `A-${String(n).padStart(5, "0")}`, ts: t, ...base };
}

export function App() {
  const [filters, setFilters] = useState<Filters>({ q: "", severity: "Any", status: "Any" });
  const [autoIngest, setAutoIngest] = useState(true);

  const [traffic, setTraffic] = useState<TrafficPoint[]>(() => seedTraffic(30));
  const [alerts, setAlerts] = useState<Alert[]>(() => seedAlerts().sort((a, b) => b.ts - a.ts));
  const [rules, setRules] = useState(() => seedRules());

  const [selected, setSelected] = useState<Alert | null>(null);
  const nextAlertN = useRef(13);

  useEffect(() => {
    if (!autoIngest) return;
    const id = window.setInterval(() => {
      setAlerts((prev) => {
        const a = mkNewAlert(nextAlertN.current++);
        return [a, ...prev].slice(0, 200);
      });
      setTraffic((prev) => {
        const last = prev[prev.length - 1];
        const t = Date.now();
        const drift = (Math.random() - 0.5) * 0.12;
        const bps = Math.max(0, Math.round(last.bps * (1 + drift) + (Math.random() - 0.5) * 1_000_000));
        const pps = Math.max(0, Math.round(last.pps * (1 + drift * 0.6) + (Math.random() - 0.5) * 1200));
        const next = [...prev.slice(1), { t, bps, pps }];
        return next;
      });
    }, 2500);
    return () => window.clearInterval(id);
  }, [autoIngest]);

  const filtered = useMemo(() => {
    const q = filters.q.trim().toLowerCase();
    return alerts.filter((a) => {
      if (filters.severity !== "Any" && a.severity !== filters.severity) return false;
      if (filters.status !== "Any" && a.status !== filters.status) return false;
      if (!q) return true;
      const hay = `${a.title} ${a.category} ${a.srcIp} ${a.dstIp} ${a.protocol} ${a.sensor} ${a.status}`.toLowerCase();
      return hay.includes(q);
    });
  }, [alerts, filters]);

  const kpis = useMemo(() => {
    const open = alerts.filter((a) => a.status === "Open").length;
    const investigating = alerts.filter((a) => a.status === "Investigating").length;
    const critical = alerts.filter((a) => a.severity === "Critical").length;
    const last = traffic[traffic.length - 1];
    return { open, investigating, critical, last };
  }, [alerts, traffic]);

  function resolveSelected() {
    if (!selected) return;
    setAlerts((prev) => prev.map((a) => (a.id === selected.id ? { ...a, status: "Resolved" } : a)));
    setSelected((s) => (s ? { ...s, status: "Resolved" } : s));
  }

  function setSelectedStatus(status: AlertStatus) {
    if (!selected) return;
    setAlerts((prev) => prev.map((a) => (a.id === selected.id ? { ...a, status } : a)));
    setSelected((s) => (s ? { ...s, status } : s));
  }

  function toggleRule(id: string) {
    setRules((prev) => prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r)));
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      filters,
      alerts: filtered,
      traffic,
      rules,
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nids-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="min-h-screen bg-[radial-gradient(1200px_800px_at_20%_-20%,rgba(34,211,238,0.18),transparent_60%),radial-gradient(900px_700px_at_110%_10%,rgba(99,102,241,0.16),transparent_55%),linear-gradient(to_bottom,#020617,#0b1224_45%,#020617)]">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl border border-white/10 bg-white/5 p-2">
                <svg viewBox="0 0 24 24" fill="none" className="h-full w-full" aria-hidden="true">
                  <path
                    d="M12 3l8 4v6c0 5-3.2 8.6-8 9-4.8-.4-8-4-8-9V7l8-4Z"
                    stroke="rgb(226 232 240)"
                    strokeWidth="1.7"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 12h8"
                    stroke="rgb(34 211 238)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                  <path
                    d="M12 8v8"
                    stroke="rgb(99 102 241)"
                    strokeWidth="1.7"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-semibold tracking-tight text-slate-100">
                Network Intrusion Detection
              </h1>
              <Badge className="text-[11px]">SOC Console</Badge>
            </div>
            <p className="mt-1 text-sm text-slate-300/80">
              Triage alerts, monitor throughput, and manage detection rules.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant={autoIngest ? "primary" : "secondary"} onClick={() => setAutoIngest((v) => !v)}>
              {autoIngest ? "Live ingest: ON" : "Live ingest: OFF"}
            </Button>
            <Button variant="secondary" onClick={exportJson}>
              Export JSON
            </Button>
          </div>
        </header>

        <main className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <Card>
                <CardHeader title="Open alerts" subtitle="Requires triage" />
                <CardBody className="space-y-3">
                  <div className="text-3xl font-semibold text-slate-100">{formatNumber(kpis.open)}</div>
                  <div className="text-xs text-slate-300/80">Top priority items currently unassigned.</div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Investigating" subtitle="In progress" />
                <CardBody className="space-y-3">
                  <div className="text-3xl font-semibold text-slate-100">
                    {formatNumber(kpis.investigating)}
                  </div>
                  <div className="text-xs text-slate-300/80">Active cases with ongoing analysis.</div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader title="Critical" subtitle="Last 200 events" />
                <CardBody className="space-y-3">
                  <div className="text-3xl font-semibold text-slate-100">{formatNumber(kpis.critical)}</div>
                  <div className="text-xs text-slate-300/80">Immediate action recommended.</div>
                </CardBody>
              </Card>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Card>
                <CardHeader
                  title="Throughput"
                  subtitle="Rolling 30 minutes"
                  right={<Badge className="text-[11px]">{formatBps(kpis.last.bps)}</Badge>}
                />
                <CardBody className="space-y-2">
                  <Sparkline points={traffic} valueKey="bps" />
                  <div className="flex items-center justify-between text-xs text-slate-300/80">
                    <span>Current</span>
                    <span className="font-medium text-slate-100">{formatBps(kpis.last.bps)}</span>
                  </div>
                </CardBody>
              </Card>
              <Card>
                <CardHeader
                  title="Packet rate"
                  subtitle="Rolling 30 minutes"
                  right={<Badge className="text-[11px]">{formatPps(kpis.last.pps)}</Badge>}
                />
                <CardBody className="space-y-2">
                  <Sparkline points={traffic} valueKey="pps" />
                  <div className="flex items-center justify-between text-xs text-slate-300/80">
                    <span>Current</span>
                    <span className="font-medium text-slate-100">{formatPps(kpis.last.pps)}</span>
                  </div>
                </CardBody>
              </Card>
            </div>

            <Card className="mt-4">
              <CardHeader
                title="Alerts"
                subtitle={`${filtered.length} matching (showing newest first)`}
                right={
                  <div className="flex items-center gap-2">
                    <div className="hidden sm:flex items-center gap-2">
                      <input
                        value={filters.q}
                        onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                        placeholder="Search IPs, category, title…"
                        className="h-9 w-56 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                      />
                      <select
                        value={filters.severity}
                        onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as Filters["severity"] }))}
                        className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none"
                      >
                        {(["Any", "Low", "Medium", "High", "Critical"] as const).map((s) => (
                          <option key={s} value={s}>
                            Severity: {s}
                          </option>
                        ))}
                      </select>
                      <select
                        value={filters.status}
                        onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))}
                        className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none"
                      >
                        {(["Any", "Open", "Investigating", "Resolved"] as const).map((s) => (
                          <option key={s} value={s}>
                            Status: {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <Button
                      variant="ghost"
                      onClick={() => {
                        setFilters({ q: "", severity: "Any", status: "Any" });
                      }}
                    >
                      Clear
                    </Button>
                  </div>
                }
              />
              <CardBody className="p-0">
                <div className="sm:hidden border-b border-white/10 p-4 grid grid-cols-1 gap-2">
                  <input
                    value={filters.q}
                    onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
                    placeholder="Search IPs, category, title…"
                    className="h-9 w-full rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/40"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={filters.severity}
                      onChange={(e) => setFilters((f) => ({ ...f, severity: e.target.value as Filters["severity"] }))}
                      className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none"
                    >
                      {(["Any", "Low", "Medium", "High", "Critical"] as const).map((s) => (
                        <option key={s} value={s}>
                          Severity: {s}
                        </option>
                      ))}
                    </select>
                    <select
                      value={filters.status}
                      onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value as Filters["status"] }))}
                      className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none"
                    >
                      {(["Any", "Open", "Investigating", "Resolved"] as const).map((s) => (
                        <option key={s} value={s}>
                          Status: {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <AlertTable
                  alerts={filtered}
                  selectedId={selected?.id}
                  onSelect={(a) => {
                    setSelected(a);
                  }}
                />
              </CardBody>
            </Card>
          </div>

          <div className="lg:col-span-4">
            <Card>
              <CardHeader
                title="Detection rules"
                subtitle="Toggle signatures / heuristics"
                right={<Badge className="text-[11px]">{rules.filter((r) => r.enabled).length} enabled</Badge>}
              />
              <CardBody>
                <RuleList rules={rules} onToggle={toggleRule} />
              </CardBody>
            </Card>

            <Card className="mt-4">
              <CardHeader title="Triage checklist" subtitle="Quick operator steps" />
              <CardBody>
                <ol className="space-y-2 text-sm text-slate-200">
                  {[
                    "Validate alert confidence vs. sensor noise",
                    "Check asset criticality and exposure",
                    "Correlate with authentication, DNS, and proxy logs",
                    "Contain: block, isolate endpoint, rate-limit",
                    "Document indicators and create follow-up rule",
                  ].map((x) => (
                    <li key={x} className="flex gap-2">
                      <span className="mt-0.5 h-5 w-5 rounded-md border border-white/10 bg-white/5 text-center text-xs leading-5 text-slate-100">
                        •
                      </span>
                      <span>{x}</span>
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          </div>
        </main>
      </div>

      <Drawer
        open={!!selected}
        onClose={() => setSelected(null)}
        title={selected ? `${selected.title} (${selected.id})` : "Alert"}
      >
        {selected ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <SeverityPill severity={selected.severity} />
              <Badge className="text-[11px]">{selected.category}</Badge>
              <Badge className="text-[11px]">Status: {selected.status}</Badge>
              <Badge className="text-[11px]">Sensor: {selected.sensor}</Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                  Source
                </div>
                <div className="mt-1 text-sm font-medium text-slate-100">{selected.srcIp}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                  Destination
                </div>
                <div className="mt-1 text-sm font-medium text-slate-100">
                  {selected.dstIp}
                  {selected.dstPort ? <span className="text-slate-300/80">:{selected.dstPort}</span> : null}
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                  Protocol
                </div>
                <div className="mt-1 text-sm font-medium text-slate-100">{selected.protocol}</div>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-3">
                <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                  Timestamp
                </div>
                <div className="mt-1 text-sm font-medium text-slate-100">{formatDateTime(selected.ts)}</div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                Telemetry
              </div>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                  <div className="text-[11px] text-slate-300/80">Confidence</div>
                  <div className="font-medium text-slate-100">{selected.confidence}%</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                  <div className="text-[11px] text-slate-300/80">Bytes</div>
                  <div className="font-medium text-slate-100">{formatBytes(selected.bytes ?? 0)}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                  <div className="text-[11px] text-slate-300/80">Packets</div>
                  <div className="font-medium text-slate-100">{formatNumber(selected.packets ?? 0)}</div>
                </div>
                <div className="rounded-lg border border-white/10 bg-slate-950/30 p-2">
                  <div className="text-[11px] text-slate-300/80">Fingerprint</div>
                  <div className="truncate font-medium text-slate-100">{selected.fingerprint ?? "—"}</div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-3">
              <div className="text-[11px] font-semibold uppercase tracking-wide text-slate-300/80">
                Analyst notes
              </div>
              <div className="mt-1 text-sm text-slate-100">{selected.notes ?? "—"}</div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <Button variant="primary" onClick={() => setSelectedStatus("Investigating")}>
                Mark Investigating
              </Button>
              <Button variant="secondary" onClick={() => setSelectedStatus("Open")}>
                Re-open
              </Button>
              <Button variant="secondary" onClick={resolveSelected}>
                Resolve
              </Button>
              <Button
                variant="danger"
                onClick={() => {
                  setAlerts((prev) => prev.filter((a) => a.id !== selected.id));
                  setSelected(null);
                }}
              >
                Delete
              </Button>
            </div>

            <div className="text-xs text-slate-300/70">
              This is a demo UI with simulated data (no real packet capture).
            </div>
          </div>
        ) : null}
      </Drawer>

      <footer className="mx-auto max-w-7xl px-4 pb-8 pt-2 text-xs text-slate-400/70 sm:px-6 lg:px-8">
        Tip: click an alert row to open the investigation drawer.
      </footer>
    </div>
  );
}
