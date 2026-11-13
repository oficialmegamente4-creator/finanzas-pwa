import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { FinanceSnapshot } from '../lib/cloudData'
import { hasUserClearPending, readUserCache } from '../lib/userCache'
import { TRANSACTIONS_KEY } from '../lib/storage'
import type { Transaction } from '../types'

const cloud = vi.hoisted(() => ({
  clearFinanceData: vi.fn(),
  deleteBudgets: vi.fn(),
  deleteTransactions: vi.fn(),
  ensureUserCategories: vi.fn(),
  loadFinanceSnapshot: vi.fn(),
  replaceFinanceData: vi.fn(),
  upsertBudgets: vi.fn(),
  upsertSettings: vi.fn(),
  upsertTransactions: vi.fn(),
}))

vi.mock('../lib/cloudData', () => cloud)

import { useTransactions } from './useTransactions'

const transaction: Transaction = {
  id: 'movimiento-nube-1',
  type: 'expense',
  description: 'Mercado',
  amount: 25.5,
  category: 'Comida',
  date: '2026-11-12',
  createdAt: '2026-11-12T12:00:00.000Z',
}

let remote: FinanceSnapshot

function setOnline(online: boolean) {
  Object.defineProperty(navigator, 'onLine', { configurable: true, value: online })
}

describe('sincronización de movimientos', () => {
  beforeEach(() => {
    localStorage.clear()
    setOnline(true)
    Object.values(cloud).forEach((mock) => mock.mockReset())
    remote = { transactions: [], budgets: [], settings: { currency: 'USD', theme: 'system' } }
    cloud.clearFinanceData.mockResolvedValue(undefined)
    cloud.deleteBudgets.mockResolvedValue([])
    cloud.deleteTransactions.mockResolvedValue([])
    cloud.ensureUserCategories.mockResolvedValue(undefined)
    cloud.loadFinanceSnapshot.mockImplementation(async () => structuredClone(remote))
    cloud.replaceFinanceData.mockResolvedValue(undefined)
    cloud.upsertBudgets.mockResolvedValue(undefined)
    cloud.upsertSettings.mockResolvedValue(undefined)
    cloud.upsertTransactions.mockImplementation(async (_userId: string, items: Transaction[]) => {
      const byId = new Map(remote.transactions.map((item) => [item.id, item]))
      for (const item of items) byId.set(item.id, item)
      remote = { ...remote, transactions: [...byId.values()] }
    })
  })

  it('recupera movimientos de Supabase al iniciar', async () => {
    remote = { ...remote, transactions: [transaction] }
    const { result } = renderHook(() => useTransactions('usuario-a'))

    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    expect(result.current.transactions).toEqual([transaction])
  })

  it('guarda sin conexión, reintenta y evita duplicar el movimiento', async () => {
    const { result } = renderHook(() => useTransactions('usuario-a'))
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    setOnline(false)

    let saved: Awaited<ReturnType<typeof result.current.addTransaction>> | undefined
    await act(async () => { saved = await result.current.addTransaction(transaction) })

    expect(saved?.ok).toBe(true)
    expect(saved?.synced).toBe(false)
    expect(readUserCache('usuario-a').data.pendingUpserts).toEqual([transaction])
    expect(remote.transactions).toEqual([])

    setOnline(true)
    await act(async () => { await result.current.retrySync() })
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))

    expect(result.current.transactions).toEqual([transaction])
    expect(readUserCache('usuario-a').data.pendingUpserts).toEqual([])
    expect(remote.transactions).toEqual([transaction])
  })

  it('conserva el movimiento local si Supabase rechaza su borrado', async () => {
    remote = { ...remote, transactions: [transaction] }
    const { result } = renderHook(() => useTransactions('usuario-a'))
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    cloud.deleteTransactions.mockRejectedValueOnce(new Error('sin conexión'))

    let deleted: Awaited<ReturnType<typeof result.current.deleteTransaction>> | undefined
    await act(async () => { deleted = await result.current.deleteTransaction(transaction.id) })

    expect(deleted?.transaction).toBeNull()
    expect(deleted?.error).toBe('sin conexión')
    expect(result.current.transactions).toEqual([transaction])
  })

  it('mantiene el borrado pendiente si falla la limpieza local y no vuelve a migrar el historial', async () => {
    const { result } = renderHook(() => useTransactions('usuario-a'))
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))
    localStorage.setItem(TRANSACTIONS_KEY, JSON.stringify([transaction]))
    const originalRemoveItem = Storage.prototype.removeItem
    const removeItem = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(function (this: Storage, key: string) {
      if (key === TRANSACTIONS_KEY) throw new Error('almacenamiento bloqueado')
      return originalRemoveItem.call(this, key)
    })

    let cleared: Awaited<ReturnType<typeof result.current.clearAllData>> | undefined
    await act(async () => { cleared = await result.current.clearAllData() })

    expect(cleared?.ok).toBe(true)
    expect(cleared?.synced).toBe(false)
    expect(hasUserClearPending('usuario-a')).toBe(true)
    removeItem.mockRestore()

    await act(async () => { await result.current.retrySync() })
    await waitFor(() => expect(result.current.syncStatus).toBe('synced'))

    expect(result.current.transactions).toEqual([])
    expect(localStorage.getItem(TRANSACTIONS_KEY)).toBeNull()
    expect(hasUserClearPending('usuario-a')).toBe(false)
  })
})
