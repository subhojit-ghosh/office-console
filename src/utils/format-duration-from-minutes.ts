export function formatDurationFromMinutes(
  totalMinutes: number,
  options?: { omitZeroHours?: boolean; omitZeroMinutes?: boolean },
): string {
  const { omitZeroHours = true, omitZeroMinutes = true } = options ?? {};

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  const parts: string[] = [];

  if (!(omitZeroHours && hours === 0)) {
    parts.push(`${hours}h`);
  }

  if (!(omitZeroMinutes && minutes === 0)) {
    parts.push(`${minutes}m`);
  }

  return parts.join(" ").trim();
}
