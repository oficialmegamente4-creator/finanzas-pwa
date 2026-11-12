export const CURRENCIES = ['USD', 'EUR', 'COP', 'MXN', 'ARS', 'CLP', 'PEN'] as const

const currencyByRegion: Record<string, string> = {
  US: 'USD', GB: 'USD', CA: 'USD', CO: 'COP', MX: 'MXN', AR: 'ARS', CL: 'CLP', PE: 'PEN', ES: 'EUR',
}

export function defaultCurrency(locale = typeof navigator === 'undefined' ? 'en-US' : navigator.language): string {
  try {
    const region = new Intl.Locale(locale).region ?? ''
    const candidate = currencyByRegion[region] ?? 'USD'
    return CURRENCIES.includes(candidate as (typeof CURRENCIES)[number]) ? candidate : 'USD'
  } catch {
    return 'USD'
  }
}

export function parseAmountToCents(input: string): number | null {
  const normalized = input.replace(/\s/g, '').replace(',', '.')
  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) return null
  const amount = Number(normalized)
  if (!Number.isFinite(amount) || amount <= 0 || amount > 1_000_000_000_000) return null
  const cents = Math.round(amount * 100)
  return cents > 0 ? cents : null
}

export const centsFromAmount = (amount: number): number => Math.round(amount * 100)

export function formatMoney(amount: number, currency: string, locale = typeof navigator === 'undefined' ? 'es-CO' : navigator.language): string {
  try {
    return new Intl.NumberFormat(locale, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
  } catch {
    return new Intl.NumberFormat('es', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(amount)
  }
}

export function formatCents(cents: number, currency: string, locale?: string): string {
  return formatMoney(cents / 100, currency, locale)
}
