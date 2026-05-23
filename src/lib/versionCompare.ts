export function normalizeVersion(value: string): string {
  let v = value.trim();
  if (v.toLowerCase().startsWith("v")) v = v.slice(1);
  const plus = v.indexOf("+");
  if (plus >= 0) v = v.slice(0, plus);
  return v;
}

export function compareVersions(left: string, right: string): number {
  const a = normalizeVersion(left)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const b = normalizeVersion(right)
    .split(".")
    .map((p) => parseInt(p, 10) || 0);
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x !== y) return x > y ? 1 : -1;
  }
  return 0;
}

export function isNewerVersion(latest: string, current: string): boolean {
  return compareVersions(latest, current) > 0;
}
