import type { Alert, Rule, TrafficPoint } from "../types/nids";

function now() {
  return Date.now();
}

export function seedRules(): Rule[] {
  const base: Omit<Rule, "id">[] = [
    {
      name: "TCP SYN scan burst",
      enabled: true,
      category: "Port Scan",
      severity: "High",
      match: "syn_rate(src_ip) > 120/s over 10s",
      action: "Alert",
      hits24h: 18,
    },
    {
      name: "SSH brute force",
      enabled: true,
      category: "Brute Force",
      severity: "Critical",
      match: "dst_port=22 AND failed_logins(src_ip) >= 10 in 2m",
      action: "Alert",
      hits24h: 7,
    },
    {
      name: "Suspicious DNS tunneling",
      enabled: true,
      category: "Data Exfiltration",
      severity: "Critical",
      match: "dns.qname_entropy > 4.2 AND qname_len > 50",
      action: "Alert",
      hits24h: 3,
    },
    {
      name: "Known C2 over TLS (JA3)",
      enabled: true,
      category: "Malware",
      severity: "High",
      match: "tls.ja3 in threatlist",
      action: "Drop",
      hits24h: 12,
    },
    {
      name: "Web SQL injection patterns",
      enabled: true,
      category: "Web Attack",
      severity: "Medium",
      match: "http.uri matches '(?i)(union select|or 1=1|sleep\\()'",
      action: "Alert",
      hits24h: 25,
    },
    {
      name: "ICMP flood anomaly",
      enabled: false,
      category: "Anomaly",
      severity: "Medium",
      match: "icmp_rate(dst_ip) > baseline*4",
      action: "Log",
      hits24h: 0,
    },
  ];

  const t = now();
  return base.map((r, idx) => ({
    id: `R-${String(idx + 1).padStart(3, "0")}`,
    lastTriggered: idx % 2 === 0 ? t - (idx + 1) * 36e5 : undefined,
    ...r,
  }));
}

export function seedTraffic(minutes = 30): TrafficPoint[] {
  const end = now();
  const start = end - minutes * 60_000;
  const pts: TrafficPoint[] = [];
  for (let i = 0; i <= minutes; i++) {
    const t = start + i * 60_000;
    const baseBps = 12_000_000;
    const basePps = 18_000;
    const wave = Math.sin(i / 5) * 0.18 + Math.cos(i / 9) * 0.12;
    const burst = i % 11 === 0 ? 0.65 : 0;
    const bps = Math.round(baseBps * (1 + wave + burst) + (Math.random() - 0.5) * 1_200_000);
    const pps = Math.round(basePps * (1 + wave * 0.8 + burst * 0.9) + (Math.random() - 0.5) * 1500);
    pts.push({ t, bps: Math.max(0, bps), pps: Math.max(0, pps) });
  }
  return pts;
}

export function seedAlerts(): Alert[] {
  const t = now();
  const mk = (a: Omit<Alert, "id" | "ts">, minsAgo: number, n: number) =>
    ({
      id: `A-${String(n).padStart(5, "0")}`,
      ts: t - minsAgo * 60_000,
      ...a,
    }) satisfies Alert;

  return [
    mk(
      {
        title: "SSH brute force attempt",
        category: "Brute Force",
        severity: "Critical",
        status: "Open",
        srcIp: "203.0.113.45",
        dstIp: "10.10.3.21",
        dstPort: 22,
        protocol: "TCP",
        sensor: "edge-sensor-1",
        confidence: 92,
        packets: 1440,
        bytes: 2_340_000,
        fingerprint: "auth.fail-burst",
        notes: "Multiple usernames targeted; rate exceeds threshold.",
      },
      4,
      12
    ),
    mk(
      {
        title: "Potential DNS tunneling",
        category: "Data Exfiltration",
        severity: "Critical",
        status: "Investigating",
        srcIp: "10.10.8.14",
        dstIp: "8.8.8.8",
        dstPort: 53,
        protocol: "UDP",
        sensor: "core-tap-2",
        confidence: 88,
        packets: 980,
        bytes: 7_100_000,
        fingerprint: "dns.entropy",
        notes: "High-entropy subdomains with uniform length; verify host process tree.",
      },
      16,
      11
    ),
    mk(
      {
        title: "SYN scan against web tier",
        category: "Port Scan",
        severity: "High",
        status: "Open",
        srcIp: "198.51.100.77",
        dstIp: "10.10.2.10",
        dstPort: 443,
        protocol: "TCP",
        sensor: "edge-sensor-1",
        confidence: 81,
        packets: 5200,
        bytes: 1_900_000,
        fingerprint: "syn.rate",
        notes: "Sequential port sweep pattern; source rotates every ~30s.",
      },
      9,
      10
    ),
    mk(
      {
        title: "C2-like TLS fingerprint",
        category: "Malware",
        severity: "High",
        status: "Resolved",
        srcIp: "10.10.6.55",
        dstIp: "185.199.110.153",
        dstPort: 443,
        protocol: "TLS",
        sensor: "core-tap-2",
        confidence: 76,
        packets: 640,
        bytes: 12_400_000,
        fingerprint: "ja3: 72a589da586844d7f0818ce684948eea",
        notes: "Endpoint isolated; block rule pushed to edge.",
      },
      44,
      9
    ),
    mk(
      {
        title: "SQLi probe on /api/login",
        category: "Web Attack",
        severity: "Medium",
        status: "Open",
        srcIp: "192.0.2.146",
        dstIp: "10.10.2.10",
        dstPort: 443,
        protocol: "HTTP",
        sensor: "edge-sensor-1",
        confidence: 69,
        packets: 120,
        bytes: 190_000,
        fingerprint: "http.sqli",
        notes: "Requests contain classic UNION SELECT payloads; WAF should mitigate.",
      },
      27,
      8
    ),
  ];
}
