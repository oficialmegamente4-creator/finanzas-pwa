import type { Period } from '../types'

const datePattern = /^(\d{4})-(\d{2})-(\d{2})$/

export function localDateString(date = new Date()): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function parseLocalDate(value: string): Date | null {
  const match = datePattern.exec(value)
  if (!match) return null
  const [, yearText, monthText, dayText] = match
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}

export function formatLongDate(value: string, locale = typeof navigator === 'undefined' ? 'es-CO' : navigator.language): string {
  const date = parseLocalDate(value)
  return date ? new Intl.DateTimeFormat(locale, { dateStyle: 'long' }).format(date) : value
}

export function relativeDateLabel(value: string, today = localDateString()): string {
  const date = parseLocalDate(value)
  const current = parseLocalDate(today)
  if (!date || !current) return formatLongDate(value)
  const yesterday = new Date(current.getFullYear(), current.getMonth(), current.getDate() - 1)
  if (value === today) return 'Hoy'
  if (localDateString(yesterday) === value) return 'Ayer'
  return formatLongDate(value)
}

export function periodContains(period: Period, value: string): boolean {
  if (period.kind === 'all') return true
  const date = parseLocalDate(value)
  return Boolean(date && date.getFullYear() === period.year && date.getMonth() === period.month)
}

export function formatPeriod(period: Period, locale = typeof navigator === 'undefined' ? 'es-CO' : navigator.language): string {
  if (period.kind === 'all') return 'Todo el historial'
  return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(new Date(period.year, period.month, 1))
}

export function movePeriod(period: Period, amount: number): Period {
  if (period.kind === 'all') return period
  const date = new Date(period.year, period.month + amount, 1)
  return { kind: 'month', year: date.getFullYear(), month: date.getMonth() }
}
