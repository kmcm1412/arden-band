import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(dateString: string) {
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
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
  const date = new Date(dateString)
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}
