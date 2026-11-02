export const PUBLIC_PARTNER_DAILY_LIMIT = 5;

/**
 * Build a calendar-day quota window using Asia/Kolkata (IST).
 * India does not observe daylight-saving time, so the UTC+05:30 offset
 * produces the correct date key and seconds until the next IST midnight.
 */
export function getIndiaDailyQuotaWindow(now: Date = new Date()): {
  day: string;
  ttlSeconds: number;
} {
  const istNow = new Date(now.getTime() + 5.5 * 60 * 60 * 1000);
  const year = istNow.getUTCFullYear();
  const month = String(istNow.getUTCMonth() + 1).padStart(2, '0');
  const date = String(istNow.getUTCDate()).padStart(2, '0');
  const millisecondsIntoDay =
    (((istNow.getUTCHours() * 60 + istNow.getUTCMinutes()) * 60) +
      istNow.getUTCSeconds()) * 1000 +
    istNow.getUTCMilliseconds();

  return {
    day: `${year}-${month}-${date}`,
    ttlSeconds: Math.max(1, Math.ceil((86_400_000 - millisecondsIntoDay) / 1000)),
  };
}
