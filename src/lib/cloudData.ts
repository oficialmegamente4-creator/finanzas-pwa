import { CATEGORIES } from '../constants/categories'
import { isValidTransaction } from './storage'
import { supabase } from './supabase'
import type { DbBudget, DbTransaction } from './database.types'
import type { Budget, Settings, Transaction } from '../types'

const WRITE_BATCH_SIZE = 200

export interface FinanceSnapshot {
  transactions: Transaction[]
  budgets: Budget[]
  settings: Settings
}

function client() {
  if (!supabase) throw new Error('Supabase no está configurado.')
  return supabase
}

function fromDatabase(row: DbTransaction): Transaction {
  const transaction: Transaction = {
    id: row.id,
    type: row.type === 'income' ? 'income' : 'expense',
    description: row.description,
    amount: Number(row.amount),
    category: row.category,
    date: row.date,
    createdAt: row.created_at,
  }
  if (!isValidTransaction(transaction)) throw new Error(`Supabase devolvió un movimiento inválido (${row.id}).`)
  return transaction
}

function budgetFromDatabase(row: DbBudget): Budget {
  return { id: row.id, category: row.category, periodStart: row.period_start, amount: Number(row.amount), createdAt: row.created_at }
}

function transactionToDatabase(userId: string, transaction: Transaction) {
  return {
    user_id: userId,
    id: transaction.id,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    date: transaction.date,
    created_at: transaction.createdAt,
  }
}

function chunks<T>(items: readonly T[], size: number): T[][] {
  const result: T[][] = []
  for (let index = 0; index < items.length; index += size) result.push(items.slice(index, index + size))
  return result
}

export async function ensureUserCategories(userId: string): Promise<void> {
  const rows = CATEGORIES.map((category) => ({
    user_id: userId,
    type: category.type,
    name: category.name,
    color: category.color,
  }))
  const { error } = await client().from('categories').upsert(rows, {
    onConflict: 'user_id,type,name',
    ignoreDuplicates: true,
  })
  if (error) throw error
}

export async function loadFinanceSnapshot(userId: string, defaultSettings: Settings): Promise<FinanceSnapshot> {
  await ensureUserCategories(userId)
  const db = client()
  const { data: existingProfile, error: profileReadError } = await db
    .from('profiles')
    .select('user_id,currency,theme')
    .eq('user_id', userId)
    .maybeSingle()
  if (profileReadError) throw profileReadError

  if (!existingProfile) {
    const { error } = await db.from('profiles').upsert({
      user_id: userId,
      currency: defaultSettings.currency,
      theme: defaultSettings.theme,
    }, { onConflict: 'user_id', ignoreDuplicates: true })
    if (error) throw error
  }

  const [profileResult, transactionResult, budgetResult] = await Promise.all([
    db.from('profiles').select('user_id,currency,theme').eq('user_id', userId).single(),
    db.from('transactions').select('*').eq('user_id', userId).order('date', { ascending: false }).order('created_at', { ascending: false }),
    db.from('budgets').select('*').eq('user_id', userId).order('period_start', { ascending: false }),
  ])
  if (profileResult.error) throw profileResult.error
  if (transactionResult.error) throw transactionResult.error
  if (budgetResult.error) throw budgetResult.error

  return {
    settings: { currency: profileResult.data.currency, theme: profileResult.data.theme as Settings['theme'] },
    transactions: transactionResult.data.map(fromDatabase),
    budgets: budgetResult.data.map(budgetFromDatabase),
  }
}

export async function upsertTransactions(userId: string, transactions: readonly Transaction[], ignoreDuplicates = false): Promise<void> {
  if (!transactions.length) return
  await ensureUserCategories(userId)
  for (const batch of chunks(transactions, WRITE_BATCH_SIZE)) {
    const { error } = await client().from('transactions').upsert(
      batch.map((item) => transactionToDatabase(userId, item)),
      { onConflict: 'user_id,id', ignoreDuplicates },
    )
    if (error) throw error
  }
}

export async function deleteTransactions(userId: string, ids: readonly string[]): Promise<string[]> {
  const deleted: string[] = []
  if (!ids.length) return deleted
  for (const batch of chunks(ids, WRITE_BATCH_SIZE)) {
    const { data, error } = await client().from('transactions').delete().eq('user_id', userId).in('id', batch).select('id')
    if (error) throw error
    deleted.push(...data.map((row) => row.id))
  }
  return deleted
}

export async function upsertSettings(userId: string, settings: Settings): Promise<void> {
  const { error } = await client().from('profiles').upsert({
    user_id: userId,
    currency: settings.currency,
    theme: settings.theme,
  }, { onConflict: 'user_id' })
  if (error) throw error
}

export async function upsertBudgets(userId: string, budgets: readonly Budget[]): Promise<void> {
  if (!budgets.length) return
  const rows = budgets.map((budget) => ({
    user_id: userId,
    id: budget.id,
    category_type: 'expense',
    category: budget.category,
    period_start: budget.periodStart,
    amount: budget.amount,
    created_at: budget.createdAt,
  }))
  for (const batch of chunks(rows, WRITE_BATCH_SIZE)) {
    const { error } = await client().from('budgets').upsert(batch, { onConflict: 'user_id,id' })
    if (error) throw error
  }
}

export async function deleteBudgets(userId: string, ids: readonly string[]): Promise<string[]> {
  if (!ids.length) return []
  const { data, error } = await client().from('budgets').delete().eq('user_id', userId).in('id', [...ids]).select('id')
  if (error) throw error
  return data.map((row) => row.id)
}

export async function replaceFinanceData(userId: string, transactions: readonly Transaction[], budgets: readonly Budget[], settings: Settings): Promise<void> {
  await ensureUserCategories(userId)
  const payload = transactions.map((transaction) => ({
    id: transaction.id,
    type: transaction.type,
    description: transaction.description,
    amount: transaction.amount,
    category: transaction.category,
    date: transaction.date,
    created_at: transaction.createdAt,
  }))
  const budgetPayload = budgets.map((budget) => ({
    id: budget.id,
    category: budget.category,
    period_start: budget.periodStart,
    amount: budget.amount,
    created_at: budget.createdAt,
  }))
  const { error } = await client().rpc('replace_my_finance_data', {
    p_transactions: payload,
    p_budgets: budgetPayload,
    p_currency: settings.currency,
    p_theme: settings.theme,
  })
  if (error) throw error
}

export async function clearFinanceData(): Promise<void> {
  const { error } = await client().rpc('clear_my_finance_data', {})
  if (error) throw error
}
