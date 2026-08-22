import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * The band plays Eastern Time, and show datetimes are stored as naive wall
 * clock strings ("2026-08-22T20:00"). Whoever parses them has to be told which
 * zone that clock belongs to, or the answer changes with the machine: Netlify
 * runs UTC, so a naive 8pm show read as UTC expired at 4pm Eastern.
 */
export const SHOW_TIMEZONE = 'America/New_York'

const zoneParts = new Intl.DateTimeFormat('en-US', {
  timeZone: SHOW_TIMEZONE,
  hourCycle: 'h23',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
})

/** The Eastern wall clock at an instant, encoded as a UTC epoch for arithmetic */
function easternWallClock(instant: number): number {
  const v: Record<string, number> = {}
  for (const { type, value } of zoneParts.formatToParts(new Date(instant))) {
    if (type !== 'literal') v[type] = Number(value)
  }
  return Date.UTC(v.year, v.month - 1, v.day, v.hour % 24, v.minute, v.second)
}

const NAIVE_DATETIME = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{1,2}):(\d{2})(?::(\d{2}))?)?$/
const CARRIES_ZONE = /(?:Z|[+-]\d{2}:?\d{2})$/i

/**
 * Turns a stored date string into a real instant.
 *
 * A string carrying its own zone (every `createdAt`, `addedAt`, `confirmedAt`
 * we write is ISO with a Z) already names an instant and is passed straight
 * through. A naive one is read as Eastern wall clock, which is what the band
 * meant when they typed it.
 *
 * Use this instead of `new Date(str)` anywhere a stored date is compared,
 * sorted, or formatted — the bare constructor guesses the runtime's zone.
 */
export function parseShowDate(datetime: string | null | undefined): Date {
  if (!datetime) return new Date(NaN)
  const raw = datetime.trim()
  if (CARRIES_ZONE.test(raw)) return new Date(raw)

  const m = NAIVE_DATETIME.exec(raw)
  if (!m) return new Date(raw)

  const [, year, month, day, hour = '0', minute = '0', second = '0'] = m
  const target = Date.UTC(+year, +month - 1, +day, +hour, +minute, +second)

  // Solve for the instant whose Eastern wall clock reads back as the input.
  // Two passes because the first offset is sampled at the wrong instant, which
  // only matters on the two days a year the offset changes underneath us.
  let instant = target - (easternWallClock(target) - target)
  instant = target - (easternWallClock(instant) - instant)
  return new Date(instant)
}

/** ISO 8601 with the Eastern offset spelled out, e.g. "2026-08-22T20:00:00-04:00" */
export function toEasternIso(datetime: string | null | undefined): string {
  const date = parseShowDate(datetime)
  if (Number.isNaN(date.getTime())) return ''
  const wall = easternWallClock(date.getTime())
  const offsetMin = (wall - date.getTime()) / 60000
  const sign = offsetMin < 0 ? '-' : '+'
  const abs = Math.abs(offsetMin)
  const pad = (n: number) => String(n).padStart(2, '0')
  const w = new Date(wall)
  return (
    `${w.getUTCFullYear()}-${pad(w.getUTCMonth() + 1)}-${pad(w.getUTCDate())}` +
    `T${pad(w.getUTCHours())}:${pad(w.getUTCMinutes())}:${pad(w.getUTCSeconds())}` +
    `${sign}${pad(Math.floor(abs / 60))}:${pad(abs % 60)}`
  )
}

/**
 * Formats a stored date in Eastern Time regardless of where the code runs, so
 * a server render and a browser render of the same show agree.
 */
export function formatInEastern(
  dateString: string | null | undefined,
  options: Intl.DateTimeFormatOptions
): string {
  const date = parseShowDate(dateString)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-US', { ...options, timeZone: SHOW_TIMEZONE }).format(date)
}

export function formatDate(dateString: string) {
  return formatInEastern(dateString, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

/** Round to cents — avoids float drift like 3 × 10.10 = 30.299999999999997 */
export function roundMoney(n: number): number {
  return Math.round(n * 100) / 100
}

/** "$10" for whole dollars, "$22.50" otherwise */
export function fmtMoney(n: number): string {
  const r = roundMoney(n)
  return Number.isInteger(r) ? `$${r}` : `$${r.toFixed(2)}`
}

export function formatDateTime(dateString: string) {
  return formatInEastern(dateString, {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
