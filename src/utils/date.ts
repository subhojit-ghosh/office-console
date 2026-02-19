export function parseDate(val: unknown) {
  if (!val) return undefined;
  if (val instanceof Date) return val;
  if (typeof val === "string" && val.length >= 10) {
    const d = new Date(val);
    if (!isNaN(d.getTime())) return d;
  }
  return undefined;
}

/**
 * Parse a time string (12h or 24h format) into hours and minutes.
 */
export function parseTimeString(
  timeStr: string,
): { hours: number; minutes: number } | null {
  if (!timeStr || typeof timeStr !== "string") return null;

  // Handle 12h format with AM/PM
  const amPmMatch =
    /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)$/i.exec(timeStr);
  if (amPmMatch) {
    let hours = parseInt(amPmMatch[1]!, 10);
    const minutes = parseInt(amPmMatch[2]!, 10);
    const isPm = amPmMatch[4]?.toUpperCase() === "PM";

    if (hours === 12) {
      hours = isPm ? 12 : 0;
    } else {
      hours = isPm ? hours + 12 : hours;
    }

    return { hours, minutes };
  }

  // Handle 24h format (hh:mm or hh:mm:ss)
  const timeMatch = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(timeStr);
  if (timeMatch) {
    const hours = parseInt(timeMatch[1]!, 10);
    const minutes = parseInt(timeMatch[2]!, 10);
    return { hours, minutes };
  }

  return null;
}

/**
 * Combine a date and a time string into a full Date object.
 * IMPORTANT: This must run on the client so times are interpreted
 * in the user's local timezone and stored as correct UTC values.
 */
export function combineDateAndTime(
  date: Date,
  timeStr: string,
): Date | null {
  const timeParts = parseTimeString(timeStr);
  if (!timeParts) return null;

  const result = new Date(date);
  result.setHours(timeParts.hours, timeParts.minutes, 0, 0);
  return result;
}
