import { centsFromAmount } from './money'
import { periodContains } from './dates'
import { CATEGORIES } from '../constants/categories'
import type { Filters, Period, Transaction, TransactionType } from '../types'

export interface Summary {
  incomeCents: number
  expenseCents: number
  balanceCents: number
  spentPercent: number
  expensesWithoutIncome: boolean
}

export interface ExpenseSlice {
  category: string
  cents: number
  percent: number
  color: string
}

export function selectPeriodTransactions(transactions: readonly Transaction[], period: Period): Transaction[] {
  return transactions.filter((item) => periodContains(period, item.date))
}

export function selectSummary(transactions: readonly Transaction[]): Summary {
  let incomeCents = 0
  let expenseCents = 0
  for (const item of transactions) {
    if (item.type === 'income') incomeCents += centsFromAmount(item.amount)
    else expenseCents += centsFromAmount(item.amount)
  }
  return {
    incomeCents,
    expenseCents,
    balanceCents: incomeCents - expenseCents,
    spentPercent: incomeCents > 0 ? Math.round((expenseCents / incomeCents) * 100) : 0,
    expensesWithoutIncome: incomeCents === 0 && expenseCents > 0,
  }
}

export function selectExpenseDistribution(transactions: readonly Transaction[]): ExpenseSlice[] {
  const totals = new Map<string, number>()
  for (const item of transactions) {
    if (item.type === 'expense') totals.set(item.category, (totals.get(item.category) ?? 0) + centsFromAmount(item.amount))
  }
  const total = [...totals.values()].reduce((sum, cents) => sum + cents, 0)
  return [...totals.entries()].map(([category, cents]) => ({
    category,
    cents,
    percent: total ? (cents / total) * 100 : 0,
    color: CATEGORIES.find((item) => item.type === 'expense' && item.name === category)?.color ?? '#64748b',
  })).sort((a, b) => b.cents - a.cents)
}

export function selectFilteredTransactions(transactions: readonly Transaction[], filters: Filters): Transaction[] {
  const normalizedSearch = filters.search.trim().toLocaleLowerCase()
  return [...transactions].filter((item) => {
    const matchesType = filters.type === 'all' || item.type === filters.type
    const matchesCategory = !filters.category || item.category === filters.category
    const matchesSearch = !normalizedSearch || `${item.description} ${item.category}`.toLocaleLowerCase().includes(normalizedSearch)
    return matchesType && matchesCategory && matchesSearch
  }).sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))
}

export function categoriesForFilter(transactions: readonly Transaction[], type: TransactionType | 'all'): string[] {
  return [...new Set(transactions.filter((item) => type === 'all' || item.type === type).map((item) => item.category))].sort((a, b) => a.localeCompare(b, 'es'))
}
