export function formatNumber(n: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(n);
}

export function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"] as const;
  let v = Math.max(0, bytes);
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  const digits = i === 0 ? 0 : v < 10 ? 2 : 1;
  return `${v.toFixed(digits)} ${units[i]}`;
}

export function formatBps(bps: number) {
  return `${formatBytes(bps)}/s`;
}

export function formatPps(pps: number) {
  if (pps < 1000) return `${pps.toFixed(0)} pps`;
  if (pps < 1_000_000) return `${(pps / 1000).toFixed(1)} Kpps`;
  return `${(pps / 1_000_000).toFixed(2)} Mpps`;
}

export function formatTime(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(ts));
}

export function formatDateTime(ts: number) {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(new Date(ts));
}

export function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}
