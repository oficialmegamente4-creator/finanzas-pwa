import { CATEGORIES, isValidCategory } from '../constants/categories'
import { defaultCurrency, CURRENCIES } from './money'
import { parseLocalDate } from './dates'
import type { Settings, Theme, Transaction, TransactionType } from '../types'

export const TRANSACTIONS_KEY = 'finanzas:v1:transactions'
export const SETTINGS_KEY = 'finanzas:v1:settings'
export const DEFAULT_SETTINGS: Settings = { currency: defaultCurrency(), theme: 'system' }

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value)
const isTransactionType = (value: unknown): value is TransactionType => value === 'income' || value === 'expense'
const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark' || value === 'system'

export function isValidTransaction(value: unknown): value is Transaction {
  if (!isRecord(value)) return false
  const { id, type, description, amount, category, date, createdAt } = value
  return typeof id === 'string' && id.length > 0 && id.length <= 128
    && isTransactionType(type)
    && typeof description === 'string' && description.trim().length > 0 && description.trim().length <= 80
    && typeof amount === 'number' && Number.isFinite(amount) && amount > 0 && amount <= 1_000_000_000_000
    && Math.round(amount * 100) > 0 && Math.round(amount * 100) / 100 === amount
    && typeof category === 'string' && isValidCategory(type, category)
    && typeof date === 'string' && parseLocalDate(date) !== null
    && typeof createdAt === 'string' && !Number.isNaN(Date.parse(createdAt))
}

export function isValidSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false
  return typeof value.currency === 'string' && CURRENCIES.includes(value.currency as (typeof CURRENCIES)[number]) && isTheme(value.theme)
}

export function validateTransactions(value: unknown): Transaction[] {
  if (!Array.isArray(value)) return []
  const seenIds = new Set<string>()
  return value.filter(isValidTransaction).filter((item) => {
    if (seenIds.has(item.id)) return false
    seenIds.add(item.id)
    return true
  }).map((item) => ({ ...item, description: item.description.trim(), amount: Math.round(item.amount * 100) / 100 }))
}

export function readStoredTransactions(): { data: Transaction[]; error: string | null } {
  try {
    const raw = localStorage.getItem(TRANSACTIONS_KEY)
    if (!raw) return { data: [], error: null }
    return { data: validateTransactions(JSON.parse(raw)), error: null }
  } catch {
    return { data: [], error: 'No se pudieron leer los datos guardados. Puedes importar un respaldo desde Ajustes.' }
  }
}

export function readStoredSettings(): { data: Settings; error: string | null } {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { data: DEFAULT_SETTINGS, error: null }
    const parsed: unknown = JSON.parse(raw)
    return isValidSettings(parsed) ? { data: parsed, error: null } : { data: DEFAULT_SETTINGS, error: null }
  } catch {
    return { data: DEFAULT_SETTINGS, error: 'No se pudieron leer los ajustes guardados. Se usarán los valores predeterminados.' }
  }
}

export function saveStoredTransactions(transactions: readonly Transaction[]): boolean {
  try {
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify(transactions))
    return true
  } catch {
    return false
  }
}

export function saveStoredSettings(settings: Settings): boolean {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    return true
  } catch {
    return false
  }
}

export function isSupportedCategory(type: TransactionType, category: string): boolean {
  return CATEGORIES.some((item) => item.type === type && item.name === category)
}
