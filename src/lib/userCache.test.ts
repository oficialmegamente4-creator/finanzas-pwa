import { describe, expect, it, beforeEach } from 'vitest'
import { emptyUserCache, readUserCache, writeUserCache } from './userCache'
import { validateTransactions } from './storage'
import type { Transaction } from '../types'

const transaction: Transaction = {
  id: 'movimiento-1',
  type: 'expense',
  description: 'Mercado',
  amount: 0.3,
  category: 'Comida',
  date: '2026-11-12',
  createdAt: '2026-11-12T12:00:00.000Z',
}

describe('caché por usuario y migración', () => {
  beforeEach(() => localStorage.clear())

  it('no mezcla la caché local de dos cuentas', () => {
    writeUserCache('usuario-a', { ...emptyUserCache(), transactions: [transaction] })

    expect(readUserCache('usuario-a').data.transactions).toEqual([transaction])
    expect(readUserCache('usuario-b').data.transactions).toEqual([])
  })

  it('elimina identificadores duplicados antes de sincronizar para no duplicar movimientos', () => {
    expect(validateTransactions([transaction, transaction])).toEqual([transaction])
  })
})
