export type Severity = "Low" | "Medium" | "High" | "Critical";

export type AlertStatus = "Open" | "Investigating" | "Resolved";

export type AlertCategory =
  | "Port Scan"
  | "Brute Force"
  | "Malware"
  | "Data Exfiltration"
  | "Anomaly"
  | "Policy"
  | "Web Attack";

export type Alert = {
  id: string;
  ts: number; // epoch ms
  title: string;
  category: AlertCategory;
  severity: Severity;
  status: AlertStatus;
  srcIp: string;
  dstIp: string;
  dstPort?: number;
  protocol: "TCP" | "UDP" | "ICMP" | "HTTP" | "TLS";
  sensor: string;
  confidence: number; // 0..100
  bytes?: number;
  packets?: number;
  fingerprint?: string;
  notes?: string;
};

export type Rule = {
  id: string;
  name: string;
  enabled: boolean;
  category: AlertCategory;
  severity: Severity;
  match: string;
  action: "Alert" | "Drop" | "Log";
  lastTriggered?: number;
  hits24h: number;
};

export type TrafficPoint = {
  t: number; // epoch ms
  bps: number;
  pps: number;
};
