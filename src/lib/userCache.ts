import { DEFAULT_SETTINGS, isValidSettings, validateTransactions } from './storage'
import type { Budget, Settings, Transaction } from '../types'

const CACHE_PREFIX = 'finanzas:v2:user:'
const CLEAR_PREFIX = 'finanzas:v2:clear-pending:'
export const LEGACY_OWNER_KEY = 'finanzas:v2:legacy-owner'

export interface UserCache {
  transactions: Transaction[]
  budgets: Budget[]
  settings: Settings
  pendingUpserts: Transaction[]
  pendingDeletes: string[]
  pendingBudgets: Budget[]
  pendingBudgetDeletes: string[]
  pendingSettings: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function userCacheKey(userId: string): string {
  return `${CACHE_PREFIX}${userId}`
}

export function markUserClearPending(userId: string): boolean {
  try { localStorage.setItem(`${CLEAR_PREFIX}${userId}`, '1'); return true } catch { return false }
}

export function hasUserClearPending(userId: string): boolean {
  try { return localStorage.getItem(`${CLEAR_PREFIX}${userId}`) === '1' } catch { return false }
}

export function finishUserClear(userId: string): boolean {
  try {
    localStorage.removeItem(userCacheKey(userId))
    localStorage.removeItem(`${CLEAR_PREFIX}${userId}`)
    return true
  } catch {
    return false
  }
}

export function cancelUserClear(userId: string): void {
  try { localStorage.removeItem(`${CLEAR_PREFIX}${userId}`) } catch { /* Se conserva el marcador para que no se reenvíen datos mientras se recupera el almacenamiento. */ }
}

export function emptyUserCache(): UserCache {
  return { transactions: [], budgets: [], settings: DEFAULT_SETTINGS, pendingUpserts: [], pendingDeletes: [], pendingBudgets: [], pendingBudgetDeletes: [], pendingSettings: false }
}

export function readUserCache(userId: string): { data: UserCache; error: string | null } {
  try {
    const raw = localStorage.getItem(userCacheKey(userId))
    if (!raw) return { data: emptyUserCache(), error: null }
    const parsed: unknown = JSON.parse(raw)
    if (!isRecord(parsed) || parsed.version !== 2 || parsed.userId !== userId) {
      return { data: emptyUserCache(), error: 'La caché local de esta cuenta no es válida; se recuperarán los datos de Supabase.' }
    }
    const transactions = validateTransactions(parsed.transactions)
    const pendingUpserts = validateTransactions(parsed.pendingUpserts)
    const budgets = Array.isArray(parsed.budgets) ? parsed.budgets.filter(isBudget) : []
    const pendingDeletes = Array.isArray(parsed.pendingDeletes)
      ? parsed.pendingDeletes.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128)
      : []
    const pendingBudgets = Array.isArray(parsed.pendingBudgets) ? parsed.pendingBudgets.filter(isBudget) : []
    const pendingBudgetDeletes = Array.isArray(parsed.pendingBudgetDeletes)
      ? parsed.pendingBudgetDeletes.filter((id): id is string => typeof id === 'string' && id.length > 0 && id.length <= 128)
      : []
    return {
      data: {
        transactions,
        budgets,
        settings: isValidSettings(parsed.settings) ? parsed.settings : DEFAULT_SETTINGS,
        pendingUpserts,
        pendingDeletes: [...new Set(pendingDeletes)],
        pendingBudgets,
        pendingBudgetDeletes: [...new Set(pendingBudgetDeletes)],
        pendingSettings: parsed.pendingSettings === true,
      },
      error: null,
    }
  } catch {
    return { data: emptyUserCache(), error: 'No se pudo leer la caché local de esta cuenta.' }
  }
}

function isBudget(value: unknown): value is Budget {
  if (!isRecord(value)) return false
  return typeof value.id === 'string' && value.id.length > 0 && value.id.length <= 128
    && typeof value.category === 'string' && value.category.length > 0
    && typeof value.periodStart === 'string' && /^\d{4}-\d{2}-01$/.test(value.periodStart)
    && typeof value.amount === 'number' && Number.isFinite(value.amount) && value.amount > 0
    && typeof value.createdAt === 'string' && !Number.isNaN(Date.parse(value.createdAt))
}

export function writeUserCache(userId: string, cache: UserCache): boolean {
  try {
    localStorage.setItem(userCacheKey(userId), JSON.stringify({ version: 2, userId, ...cache }))
    return true
  } catch {
    return false
  }
}

export function readLegacyOwner(): string | null {
  try { return localStorage.getItem(LEGACY_OWNER_KEY) } catch { return null }
}

export function claimLegacyData(userId: string): boolean {
  try {
    const currentOwner = localStorage.getItem(LEGACY_OWNER_KEY)
    if (currentOwner && currentOwner !== userId) return false
    if (!currentOwner) localStorage.setItem(LEGACY_OWNER_KEY, userId)
    return true
  } catch {
    return false
  }
}

export function clearLegacyOwner(): void {
  try { localStorage.removeItem(LEGACY_OWNER_KEY) } catch { /* La migración remota ya confirmó los datos; se reintentará al volver a iniciar. */ }
}
