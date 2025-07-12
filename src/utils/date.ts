export function parseDate(val: unknown) {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string" && val.length >= 10) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}
