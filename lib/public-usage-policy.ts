export const PUBLIC_PARTNER_DAILY_LIMIT = 5;
export const PUBLIC_PARTNER_DAILY_WINDOW = '1 d';
export const PUBLIC_PARTNER_BURST_LIMIT = 3;
export const PUBLIC_PARTNER_BURST_WINDOW = '5 m';

const INDIA_TIME_ZONE = 'Asia/Kolkata';
const INDIA_UTC_OFFSET_MINUTES = 330;

export function getIndiaCalendarDate(date: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INDIA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? '';

  return `${value('year')}-${value('month')}-${value('day')}`;
}

export function millisecondsUntilNextIndiaMidnight(now: Date = new Date()): number {
  const [year, month, day] = getIndiaCalendarDate(now).split('-').map(Number);
  const nextMidnightUtc = Date.UTC(year, month - 1, day + 1, 0, 0, 0)
    - INDIA_UTC_OFFSET_MINUTES * 60 * 1000;

  return Math.max(0, nextMidnightUtc - now.getTime());
}
