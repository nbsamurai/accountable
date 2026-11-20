// The formats in spec 3.9, with the browser's Intl API in the en-US locale.

export const EMPTY = "–";

const LOCALE = "en-US";
const usd = new Intl.NumberFormat(LOCALE, { style: "currency", currency: "USD", maximumFractionDigits: 0 });
const count = new Intl.NumberFormat(LOCALE);
const longDate = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric", year: "numeric" });
const shortDate = new Intl.DateTimeFormat(LOCALE, { month: "short", day: "numeric" });
const weekdayDate = new Intl.DateTimeFormat(LOCALE, { weekday: "short", month: "short", day: "numeric" });
const fullDate = new Intl.DateTimeFormat(LOCALE, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
const clock = new Intl.DateTimeFormat(LOCALE, { hour: "numeric", minute: "2-digit" });
const monthLong = new Intl.DateTimeFormat(LOCALE, { month: "long" });
const monthShort = new Intl.DateTimeFormat(LOCALE, { month: "short" });

type Maybe<T> = T | null | undefined;

/** `$48,000`. Empty is "–". */
export function money(value: Maybe<number>): string {
  return value == null ? EMPTY : usd.format(value);
}

/** The short form for chart axes and the funnel: `$40K`, `$1.2M`, `$500`. */
export function moneyShort(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `$${trim(value / 1_000_000)}M`;
  if (abs >= 1_000) return `$${trim(value / 1_000)}K`;
  return `$${Math.round(value)}`;
}

function trim(value: number): string {
  return (Math.round(value * 10) / 10).toString();
}

/** `75%`. Empty is "–". */
export function percent(value: Maybe<number>): string {
  return value == null ? EMPTY : `${Math.round(value)}%`;
}

/** `1,234`. */
export function number(value: number): string {
  return count.format(value);
}

/** "1 deal", "2 deals". */
export function plural(n: number, one: string, many = `${one}s`): string {
  return `${number(n)} ${n === 1 ? one : many}`;
}

/** A date with no time, `2026-11-19`, as a local Date at midnight, so it never shifts a day. */
export function parseDay(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year!, month! - 1, day!);
}

/** A local Date as `2026-11-19`. */
export function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Today on this computer, as `2026-11-19`. */
export function todayIso(now: Date = new Date()): string {
  return isoDay(now);
}

/** Whole days from `from` to `to`, both `YYYY-MM-DD`. */
export function daysBetween(from: string, to: string): number {
  return Math.round((parseDay(to).getTime() - parseDay(from).getTime()) / 86_400_000);
}

/** `Nov 19, 2026`. Empty is "–". */
export function date(iso: Maybe<string>): string {
  return iso ? longDate.format(parseDay(iso)) : EMPTY;
}

/** `Dec 10` in the current year, or `Jan 15, 2027` in another, as on the board's cards. */
export function dateNear(iso: string, today: string): string {
  const day = parseDay(iso);
  return day.getFullYear() === parseDay(today).getFullYear() ? shortDate.format(day) : longDate.format(day);
}

/** `Mon, Nov 23`. */
export function weekday(iso: string): string {
  return weekdayDate.format(parseDay(iso));
}

/** `Thursday, November 19, 2026`. */
export function dateFull(iso: string): string {
  return fullDate.format(parseDay(iso));
}

/** A timestamp in local time: `Nov 19, 2026, 2:30 PM`. */
export function dateTime(timestamp: string): string {
  const at = new Date(timestamp);
  return `${longDate.format(at)}, ${clock.format(at)}`;
}

/** A timestamp near today, as in recent activity: `Today, 10:42 AM`, `Yesterday, 4:30 PM`, `Nov 17, 3:48 PM`. */
export function when(timestamp: string, today: string): string {
  const at = new Date(timestamp);
  const days = daysBetween(isoDay(at), today);
  const time = clock.format(at);
  if (days === 0) return `Today, ${time}`;
  if (days === 1) return `Yesterday, ${time}`;
  const sameYear = at.getFullYear() === parseDay(today).getFullYear();
  return `${sameYear ? shortDate.format(at) : longDate.format(at)}, ${time}`;
}

/** A follow-up: "Due today", "Due tomorrow", "Due Mon, Nov 23", "1 day overdue" or "3 days overdue". */
export function due(followUp: string, today: string): string {
  const days = daysBetween(today, followUp);
  if (days < 0) return `${plural(-days, "day")} overdue`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due ${weekday(followUp)}`;
}

/** `November`. */
export function monthName(iso: string): string {
  return monthLong.format(parseDay(iso));
}

/** `Nov`. */
export function monthAbbr(iso: string): string {
  return monthShort.format(parseDay(iso));
}

/** A local date and time for a `datetime-local` style value: `2026-11-19T14:30`. */
export function localDateTime(at: Date): string {
  const hh = String(at.getHours()).padStart(2, "0");
  const mm = String(at.getMinutes()).padStart(2, "0");
  return `${isoDay(at)}T${hh}:${mm}`;
}

/** Up to two initials: "Jane Doe" is "JD". */
export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
}
