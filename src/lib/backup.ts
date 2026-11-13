import { isValidSettings, validateTransactions } from './storage'
import type { Budget, Settings, Transaction } from '../types'

const MAX_BACKUP_BYTES = 5 * 1024 * 1024

export interface BackupData {
  version: 1 | 2
  exportedAt: string
  settings: Settings
  transactions: Transaction[]
  budgets?: Budget[]
}

export function createBackup(transactions: readonly Transaction[], settings: Settings, budgets: readonly Budget[] = []): BackupData {
  return { version: 2, exportedAt: new Date().toISOString(), settings, transactions: [...transactions], budgets: [...budgets] }
}

function isValidBudget(value: unknown): value is Budget {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
  const budget = value as Record<string, unknown>
  return typeof budget.id === 'string' && budget.id.length > 0 && budget.id.length <= 128
    && typeof budget.category === 'string' && budget.category.length > 0
    && typeof budget.periodStart === 'string' && /^\d{4}-\d{2}-01$/.test(budget.periodStart)
    && typeof budget.amount === 'number' && Number.isFinite(budget.amount) && budget.amount > 0
    && typeof budget.createdAt === 'string' && !Number.isNaN(Date.parse(budget.createdAt))
}

export function parseBackup(raw: string): BackupData {
  if (new Blob([raw]).size > MAX_BACKUP_BYTES) throw new Error('El archivo supera el límite de 5 MB.')
  let parsed: unknown
  try { parsed = JSON.parse(raw) } catch { throw new Error('El archivo no contiene JSON válido.') }
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('El formato del respaldo no es válido.')
  const record = parsed as Record<string, unknown>
  if ((record.version !== 1 && record.version !== 2) || !Array.isArray(record.transactions) || !isValidSettings(record.settings)) throw new Error('El respaldo no tiene una versión o estructura compatible.')
  const validTransactions = validateTransactions(record.transactions)
  if (validTransactions.length !== record.transactions.length) throw new Error('El respaldo contiene movimientos inválidos. No se importó ningún dato.')
  const budgets = record.budgets === undefined ? [] : Array.isArray(record.budgets) ? record.budgets.filter(isValidBudget) : null
  if (budgets === null || (Array.isArray(record.budgets) && budgets.length !== record.budgets.length)) throw new Error('El respaldo contiene presupuestos inválidos. No se importó ningún dato.')
  return { version: record.version, exportedAt: typeof record.exportedAt === 'string' ? record.exportedAt : '', settings: record.settings, transactions: validTransactions, budgets }
}

function protectCsvCell(value: string): string {
  const safe = /^[=+\-@]/.test(value) ? `'${value}` : value
  return `"${safe.replaceAll('"', '""')}"`
}

export function createCsv(transactions: readonly Transaction[]): string {
  const rows = [
    ['Fecha', 'Tipo', 'Descripción', 'Categoría', 'Monto'],
    ...transactions.map((item) => [item.date, item.type === 'income' ? 'Ingreso' : 'Gasto', item.description, item.category, item.amount.toFixed(2)]),
  ]
  return `\uFEFF${rows.map((row) => row.map(protectCsvCell).join(',')).join('\r\n')}`
}

export function downloadTextFile(filename: string, text: string, type: string): void {
  const url = URL.createObjectURL(new Blob([text], { type }))
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
