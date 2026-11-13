import { useCallback, useEffect, useReducer, useRef } from 'react'
import { clearFinanceData, deleteBudgets, deleteTransactions, ensureUserCategories, loadFinanceSnapshot, replaceFinanceData, upsertBudgets, upsertSettings, upsertTransactions } from '../lib/cloudData'
import { DEFAULT_SETTINGS, clearLegacyData, readLegacySnapshot } from '../lib/storage'
import { cancelUserClear, claimLegacyData, clearLegacyOwner, emptyUserCache, finishUserClear, hasUserClearPending, markUserClearPending, readLegacyOwner, readUserCache, writeUserCache, type UserCache } from '../lib/userCache'
import type { Budget, Settings, Transaction } from '../types'

export type SyncStatus = 'loading' | 'syncing' | 'synced' | 'pending' | 'offline' | 'error'

export interface MutationResult {
  ok: boolean
  synced: boolean
  error?: string
}

interface State extends UserCache {
  loading: boolean
  syncStatus: SyncStatus
  syncError: string | null
  storageError: string | null
  migrationCount: number
  migrationBlocked: boolean
  migrationError: string | null
  clearPending: boolean
}

interface ReplaceStateAction { next: State }

function replaceReducer(_state: State, action: ReplaceStateAction): State {
  return action.next
}

function initialState(userId: string): State {
  const clearPending = hasUserClearPending(userId)
  const cached = clearPending ? { data: emptyUserCache(), error: null } : readUserCache(userId)
  const legacy = readLegacySnapshot()
  const legacyOwner = readLegacyOwner()
  const migrationBlocked = legacy.hasData && legacyOwner !== null && legacyOwner !== userId
  return {
    ...cached.data,
    loading: true,
    syncStatus: 'loading',
    syncError: null,
    storageError: cached.error ?? legacy.error,
    migrationCount: migrationBlocked ? 0 : legacy.hasData ? legacy.transactions.length + legacy.invalidTransactionCount : 0,
    migrationBlocked,
    migrationError: legacy.error,
    clearPending,
  }
}

function toCache(state: State): UserCache {
  return {
    transactions: state.transactions,
    budgets: state.budgets,
    settings: state.settings,
    pendingUpserts: state.pendingUpserts,
    pendingDeletes: state.pendingDeletes,
    pendingBudgets: state.pendingBudgets,
    pendingBudgetDeletes: state.pendingBudgetDeletes,
    pendingSettings: state.pendingSettings,
  }
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message
  if (typeof error === 'object' && error !== null && 'message' in error && typeof error.message === 'string') return error.message
  return 'Ocurrió un error al sincronizar con Supabase.'
}

function sameTransaction(left: Transaction, right: Transaction): boolean {
  return left.id === right.id
    && left.type === right.type
    && left.description === right.description
    && left.amount === right.amount
    && left.category === right.category
    && left.date === right.date
    && left.createdAt === right.createdAt
}

function addOrReplaceTransaction(items: readonly Transaction[], transaction: Transaction): Transaction[] {
  const exists = items.some((item) => item.id === transaction.id)
  return exists ? items.map((item) => item.id === transaction.id ? transaction : item) : [transaction, ...items]
}

function addOrReplaceBudget(items: readonly Budget[], budget: Budget): Budget[] {
  const exists = items.some((item) => item.id === budget.id)
  return exists ? items.map((item) => item.id === budget.id ? budget : item) : [budget, ...items]
}

function messageForStorageError(): string {
  return 'No se pudo guardar una copia local. Comprueba el espacio y los permisos del navegador.'
}

export function useTransactions(userId: string) {
  const [state, dispatch] = useReducer(replaceReducer, userId, initialState)
  const stateRef = useRef(state)
  const queue = useRef<Promise<void>>(Promise.resolve())
  const syncPromise = useRef<Promise<void> | null>(null)
  const syncAgain = useRef(false)
  const enqueue = useCallback(<T,>(operation: () => Promise<T>): Promise<T> => {
    const result = queue.current.then(operation, operation)
    queue.current = result.then(() => undefined, () => undefined)
    return result
  }, [])

  const commit = useCallback((next: State, persist = true): boolean => {
    const saved = !persist || writeUserCache(userId, toCache(next))
    const committed = saved ? next : { ...next, storageError: messageForStorageError() }
    stateRef.current = committed
    dispatch({ next: committed })
    return saved
  }, [userId])

  const setSyncFailure = useCallback((error: unknown) => {
    const current = stateRef.current
    const message = errorMessage(error)
    commit({ ...current, loading: false, syncStatus: navigator.onLine ? 'error' : 'offline', syncError: message }, false)
  }, [commit])

  const performSync = useCallback(async () => {
    if (!navigator.onLine) {
      const current = stateRef.current
      commit({ ...current, loading: false, syncStatus: 'offline', syncError: current.pendingUpserts.length || current.pendingDeletes.length || current.pendingBudgets.length || current.pendingBudgetDeletes.length || current.pendingSettings ? 'Hay cambios guardados en este dispositivo que esperan conexión.' : null }, false)
      return
    }

    const initial = stateRef.current
    commit({ ...initial, syncStatus: 'syncing', syncError: null }, false)

    try {
      if (stateRef.current.clearPending) {
        await clearFinanceData()
        const legacyCleared = clearLegacyData()
        const cleared = legacyCleared && finishUserClear(userId)
        if (cleared) clearLegacyOwner()
        const empty: State = {
          ...stateRef.current,
          ...emptyUserCache(),
          loading: false,
          syncStatus: cleared ? 'synced' : 'error',
          syncError: cleared ? null : 'Supabase borró los datos, pero la caché local no se pudo limpiar; la operación se reintentará.',
          migrationCount: 0,
          migrationBlocked: false,
          migrationError: null,
          clearPending: !cleared,
        }
        stateRef.current = empty
        dispatch({ next: empty })
        return
      }

      const legacy = readLegacySnapshot()
      let legacyOwner = readLegacyOwner()
      let migrationBlocked = legacy.hasData && legacyOwner !== null && legacyOwner !== userId
      let migrationError: string | null = legacy.error

      if (legacy.hasData && !legacyOwner) {
        if (claimLegacyData(userId)) legacyOwner = userId
        else migrationError = 'No se pudo reservar la migración local para esta cuenta. Los datos anteriores permanecen en el dispositivo.'
      }
      migrationBlocked = legacy.hasData && legacyOwner !== null && legacyOwner !== userId

      const canMigrateLegacy = legacy.hasData && !migrationBlocked && legacyOwner === userId
      const fallbackSettings = canMigrateLegacy ? legacy.settings : stateRef.current.settings
      let remote = await loadFinanceSnapshot(userId, fallbackSettings)
      let migrationCount = canMigrateLegacy ? legacy.transactions.length + legacy.invalidTransactionCount : 0

      if (canMigrateLegacy && legacy.transactions.length > 0) {
        try {
          await upsertTransactions(userId, legacy.transactions, true)
          remote = await loadFinanceSnapshot(userId, fallbackSettings)
        } catch (error) {
          migrationError = `La migración local no se completó; los datos originales siguen guardados. ${errorMessage(error)}`
        }
      }

      if (canMigrateLegacy && !migrationError) {
        if (clearLegacyData()) {
          clearLegacyOwner()
          migrationCount = 0
        } else {
          migrationError = 'Los movimientos ya están en Supabase, pero no se pudo limpiar la copia antigua del dispositivo. La migración es idempotente y se puede reintentar.'
        }
      }

      const current = stateRef.current
      const sentUpserts: Transaction[] = []
      const sentDeletes = new Set<string>()
      const sentBudgets: Budget[] = []
      const sentBudgetDeletes = new Set<string>()
      let settingsSent: Settings | null = null
      let syncError: string | null = migrationError

      if (current.pendingSettings) {
        try {
          await upsertSettings(userId, current.settings)
          settingsSent = current.settings
        } catch (error) { syncError = syncError ?? errorMessage(error) }
      }

      if (current.pendingUpserts.length) {
        const sent = [...current.pendingUpserts]
        try {
          await upsertTransactions(userId, sent)
          sentUpserts.push(...sent)
        } catch (error) { syncError = syncError ?? errorMessage(error) }
      }

      if (current.pendingBudgets.length) {
        const sent = [...current.pendingBudgets]
        try {
          await upsertBudgets(userId, sent)
          sentBudgets.push(...sent)
        } catch (error) { syncError = syncError ?? errorMessage(error) }
      }

      if (current.pendingDeletes.length) {
        try {
          const deleted = await deleteTransactions(userId, current.pendingDeletes)
          deleted.forEach((id) => sentDeletes.add(id))
        } catch (error) { syncError = syncError ?? errorMessage(error) }
      }

      if (current.pendingBudgetDeletes.length) {
        try {
          const deleted = await deleteBudgets(userId, current.pendingBudgetDeletes)
          deleted.forEach((id) => sentBudgetDeletes.add(id))
        } catch (error) { syncError = syncError ?? errorMessage(error) }
      }

      try { remote = await loadFinanceSnapshot(userId, fallbackSettings) } catch (error) { syncError = syncError ?? errorMessage(error) }

      const latest = stateRef.current
      const remoteTransactionIds = new Set(remote.transactions.map((item) => item.id))
      const confirmedDeletes = new Set([...sentDeletes, ...latest.pendingDeletes.filter((id) => !remoteTransactionIds.has(id))])
      const remoteBudgetIds = new Set(remote.budgets.map((item) => item.id))
      const confirmedBudgetDeletes = new Set([...sentBudgetDeletes, ...latest.pendingBudgetDeletes.filter((id) => !remoteBudgetIds.has(id))])
      const transactionsById = new Map(remote.transactions.map((item) => [item.id, item]))
      for (const item of latest.pendingUpserts) transactionsById.set(item.id, item)
      for (const item of latest.transactions) {
        if (latest.pendingDeletes.includes(item.id) && !confirmedDeletes.has(item.id)) transactionsById.set(item.id, item)
      }
      for (const id of confirmedDeletes) transactionsById.delete(id)

      const budgetsById = new Map(remote.budgets.map((item) => [item.id, item]))
      for (const item of latest.pendingBudgets) budgetsById.set(item.id, item)
      for (const id of confirmedBudgetDeletes) budgetsById.delete(id)

      const pendingUpserts = latest.pendingUpserts.filter((item) => !sentUpserts.some((sent) => sameTransaction(item, sent)))
      const pendingDeletes = latest.pendingDeletes.filter((id) => !confirmedDeletes.has(id))
      const pendingBudgets = latest.pendingBudgets.filter((item) => !sentBudgets.some((sent) => item.id === sent.id && item.amount === sent.amount && item.periodStart === sent.periodStart && item.category === sent.category))
      const pendingBudgetDeletes = latest.pendingBudgetDeletes.filter((id) => !confirmedBudgetDeletes.has(id))
      const pendingSettings = latest.pendingSettings && !(settingsSent && latest.settings.currency === settingsSent.currency && latest.settings.theme === settingsSent.theme)
      const hasPending = pendingUpserts.length > 0 || pendingDeletes.length > 0 || pendingBudgets.length > 0 || pendingBudgetDeletes.length > 0 || pendingSettings

      const finalState: State = {
        ...latest,
        transactions: [...transactionsById.values()],
        budgets: [...budgetsById.values()],
        settings: pendingSettings ? latest.settings : remote.settings,
        pendingUpserts,
        pendingDeletes,
        pendingBudgets,
        pendingBudgetDeletes,
        pendingSettings,
        loading: false,
        syncStatus: syncError ? (hasPending ? 'pending' : 'error') : hasPending ? 'pending' : 'synced',
        syncError,
        migrationCount,
        migrationBlocked,
        migrationError,
        clearPending: false,
      }
      commit(finalState)
    } catch (error) {
      setSyncFailure(error)
    }
  }, [commit, setSyncFailure, userId])

  const syncNow = useCallback((): Promise<void> => {
    if (syncPromise.current) {
      syncAgain.current = true
      return syncPromise.current
    }
    const task = enqueue(async () => {
      do {
        syncAgain.current = false
        await performSync()
      } while (syncAgain.current && navigator.onLine)
    })
    syncPromise.current = task.finally(() => { syncPromise.current = null })
    return syncPromise.current
  }, [enqueue, performSync])

  useEffect(() => {
    const retryWhenOnline = () => { void syncNow() }
    const retryWhenVisible = () => { if (document.visibilityState === 'visible') void syncNow() }
    void syncNow()
    window.addEventListener('online', retryWhenOnline)
    window.addEventListener('focus', retryWhenOnline)
    document.addEventListener('visibilitychange', retryWhenVisible)
    return () => {
      window.removeEventListener('online', retryWhenOnline)
      window.removeEventListener('focus', retryWhenOnline)
      document.removeEventListener('visibilitychange', retryWhenVisible)
    }
  }, [syncNow])

  const addTransaction = useCallback(async (transaction: Transaction): Promise<MutationResult> => {
    const current = stateRef.current
    const next = { ...current, transactions: addOrReplaceTransaction(current.transactions, transaction), pendingUpserts: addOrReplaceTransaction(current.pendingUpserts, transaction), pendingDeletes: current.pendingDeletes.filter((id) => id !== transaction.id) }
    const saved = writeUserCache(userId, toCache(next))
    if (saved) commit(next, false)
    else if (!navigator.onLine) {
      commit({ ...current, storageError: messageForStorageError(), syncStatus: 'offline' }, false)
      return { ok: false, synced: false, error: messageForStorageError() }
    }
    if (!navigator.onLine) {
      commit({ ...(saved ? next : current), loading: false, syncStatus: 'pending', syncError: 'Movimiento guardado localmente. Se enviará cuando vuelva la conexión.' }, false)
      return { ok: saved, synced: false, error: saved ? undefined : messageForStorageError() }
    }
    try {
      await enqueue(async () => { await ensureUserCategories(userId); await upsertTransactions(userId, [transaction]) })
      const latest = stateRef.current
      const final = { ...latest, pendingUpserts: latest.pendingUpserts.filter((item) => !sameTransaction(item, transaction)), syncStatus: 'synced' as const, syncError: null }
      if (!saved) final.transactions = addOrReplaceTransaction(final.transactions, transaction)
      commit(final)
      return { ok: true, synced: true }
    } catch (error) {
      const latest = stateRef.current
      if (!saved) return { ok: false, synced: false, error: errorMessage(error) }
      commit({ ...latest, syncStatus: 'pending', syncError: errorMessage(error) }, false)
      return { ok: true, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const updateTransaction = useCallback(async (transaction: Transaction): Promise<MutationResult> => {
    return addTransaction(transaction)
  }, [addTransaction])

  const deleteTransaction = useCallback(async (id: string): Promise<{ transaction: Transaction | null; synced: boolean; error?: string }> => {
    const current = stateRef.current
    const transaction = current.transactions.find((item) => item.id === id) ?? null
    if (!transaction) return { transaction: null, synced: false }
    if (!navigator.onLine) return { transaction: null, synced: false, error: 'Conéctate para confirmar el borrado. El movimiento se conserva.' }
    try {
      await enqueue(async () => { await deleteTransactions(userId, [id]) })
      const latest = stateRef.current
      const next: State = {
        ...latest,
        transactions: latest.transactions.filter((item) => item.id !== id),
        pendingUpserts: latest.pendingUpserts.filter((item) => item.id !== id),
        pendingDeletes: latest.pendingDeletes.filter((item) => item !== id),
        syncStatus: 'synced',
        syncError: null,
      }
      commit(next)
      return { transaction, synced: true }
    } catch (error) {
      commit({ ...stateRef.current, syncStatus: 'error', syncError: errorMessage(error) }, false)
      return { transaction: null, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const restoreTransaction = useCallback(async (transaction: Transaction): Promise<MutationResult> => addTransaction(transaction), [addTransaction])

  const updateSettings = useCallback(async (settings: Settings): Promise<MutationResult> => {
    const current = stateRef.current
    const next = { ...current, settings, pendingSettings: true }
    const saved = writeUserCache(userId, toCache(next))
    if (saved) commit(next, false)
    else if (!navigator.onLine) return { ok: false, synced: false, error: messageForStorageError() }
    if (!navigator.onLine) return { ok: saved, synced: false, error: saved ? undefined : messageForStorageError() }
    try {
      await enqueue(() => upsertSettings(userId, settings))
      const latest = stateRef.current
      const isCurrent = latest.settings.currency === settings.currency && latest.settings.theme === settings.theme
      const final = { ...latest, pendingSettings: !isCurrent, syncStatus: isCurrent ? 'synced' as const : 'pending' as const, syncError: null }
      commit(final)
      return { ok: true, synced: isCurrent }
    } catch (error) {
      if (!saved) return { ok: false, synced: false, error: errorMessage(error) }
      commit({ ...stateRef.current, syncStatus: 'pending', syncError: errorMessage(error) }, false)
      return { ok: true, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const saveBudget = useCallback(async (budget: Budget): Promise<MutationResult> => {
    const current = stateRef.current
    const next = { ...current, budgets: addOrReplaceBudget(current.budgets, budget), pendingBudgets: addOrReplaceBudget(current.pendingBudgets, budget) }
    const saved = writeUserCache(userId, toCache(next))
    if (saved) commit(next, false)
    else if (!navigator.onLine) return { ok: false, synced: false, error: messageForStorageError() }
    if (!navigator.onLine) return { ok: saved, synced: false, error: saved ? undefined : messageForStorageError() }
    try {
      await enqueue(() => upsertBudgets(userId, [budget]))
      const latest = stateRef.current
      const final = { ...latest, pendingBudgets: latest.pendingBudgets.filter((item) => item.id !== budget.id), syncStatus: 'synced' as const, syncError: null }
      commit(final)
      return { ok: true, synced: true }
    } catch (error) {
      if (!saved) return { ok: false, synced: false, error: errorMessage(error) }
      commit({ ...stateRef.current, syncStatus: 'pending', syncError: errorMessage(error) }, false)
      return { ok: true, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const deleteBudget = useCallback(async (id: string): Promise<MutationResult> => {
    if (!navigator.onLine) return { ok: false, synced: false, error: 'Conéctate para confirmar el borrado del presupuesto.' }
    try {
      await enqueue(() => deleteBudgets(userId, [id]))
      const current = stateRef.current
      commit({ ...current, budgets: current.budgets.filter((item) => item.id !== id), pendingBudgets: current.pendingBudgets.filter((item) => item.id !== id), syncStatus: 'synced', syncError: null })
      return { ok: true, synced: true }
    } catch (error) {
      commit({ ...stateRef.current, syncStatus: 'error', syncError: errorMessage(error) }, false)
      return { ok: false, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const importData = useCallback(async (payload: { transactions: Transaction[]; budgets?: Budget[]; settings: Settings; mode: 'replace' | 'merge' }): Promise<MutationResult> => {
    if (payload.mode === 'replace') {
      if (!navigator.onLine) return { ok: false, synced: false, error: 'Conéctate antes de reemplazar datos. No se cambió ninguna información.' }
      try {
        await enqueue(() => replaceFinanceData(userId, payload.transactions, payload.budgets ?? [], payload.settings))
        const current = stateRef.current
        const next: State = {
          ...current,
          transactions: payload.transactions,
          budgets: payload.budgets ?? [],
          settings: payload.settings,
          pendingUpserts: [],
          pendingDeletes: [],
          pendingBudgets: [],
          pendingBudgetDeletes: [],
          pendingSettings: false,
          syncStatus: 'synced',
          syncError: null,
        }
        commit(next)
        return { ok: true, synced: true }
      } catch (error) {
        commit({ ...stateRef.current, syncStatus: 'error', syncError: errorMessage(error) }, false)
        return { ok: false, synced: false, error: errorMessage(error) }
      }
    }

    const current = stateRef.current
    const transactions = [...payload.transactions, ...current.transactions.filter((item) => !payload.transactions.some((incoming) => incoming.id === item.id))]
    const budgets = [...(payload.budgets ?? []), ...current.budgets.filter((item) => !(payload.budgets ?? []).some((incoming) => incoming.id === item.id))]
    const next = {
      ...current,
      transactions,
      budgets,
      settings: payload.settings,
      pendingUpserts: [...payload.transactions, ...current.pendingUpserts.filter((item) => !payload.transactions.some((incoming) => incoming.id === item.id))],
      pendingBudgets: [...(payload.budgets ?? []), ...current.pendingBudgets.filter((item) => !(payload.budgets ?? []).some((incoming) => incoming.id === item.id))],
      pendingSettings: true,
    }
    const saved = writeUserCache(userId, toCache(next))
    if (!saved) return { ok: false, synced: false, error: messageForStorageError() }
    if (saved) commit({ ...next, syncStatus: 'pending' }, false)
    if (!navigator.onLine) return { ok: true, synced: false }
    await syncNow()
    const latest = stateRef.current
    const hasPending = latest.pendingUpserts.length > 0 || latest.pendingBudgets.length > 0 || latest.pendingSettings
    if (!saved && hasPending) return { ok: false, synced: false, error: latest.syncError ?? messageForStorageError() }
    return { ok: true, synced: !hasPending, error: latest.syncError ?? undefined }
  }, [commit, enqueue, syncNow, userId])

  const clearAllData = useCallback(async (): Promise<MutationResult> => {
    if (!navigator.onLine) return { ok: false, synced: false, error: 'Conéctate antes de borrar los datos. No se cambió ninguna información.' }
    if (!markUserClearPending(userId)) return { ok: false, synced: false, error: messageForStorageError() }
    try {
      await enqueue(() => clearFinanceData())
      const legacyCleared = clearLegacyData()
      const cleared = legacyCleared && finishUserClear(userId)
      if (cleared) clearLegacyOwner()
      const current = stateRef.current
      const next: State = {
        ...current,
        ...emptyUserCache(),
        loading: false,
        syncStatus: cleared ? 'synced' : 'error',
        syncError: cleared ? null : 'Los datos en la nube se borraron, pero el almacenamiento local no se pudo limpiar; la operación se reintentará.',
        migrationCount: 0,
        migrationBlocked: false,
        migrationError: null,
        clearPending: !cleared,
      }
      stateRef.current = next
      dispatch({ next })
      return { ok: true, synced: cleared, error: cleared ? undefined : next.syncError ?? undefined }
    } catch (error) {
      cancelUserClear(userId)
      commit({ ...stateRef.current, syncStatus: 'error', syncError: errorMessage(error) }, false)
      return { ok: false, synced: false, error: errorMessage(error) }
    }
  }, [commit, enqueue, userId])

  const finishMigration = useCallback((): Promise<void> => syncNow(), [syncNow])

  return {
    transactions: state.transactions.filter((item) => !state.pendingDeletes.includes(item.id)),
    budgets: state.budgets.filter((item) => !state.pendingBudgetDeletes.includes(item.id)),
    settings: state.settings ?? DEFAULT_SETTINGS,
    loading: state.loading,
    syncStatus: state.syncStatus,
    syncError: state.syncError,
    storageError: state.storageError,
    migrationCount: state.migrationCount,
    migrationBlocked: state.migrationBlocked,
    migrationError: state.migrationError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    updateSettings,
    saveBudget,
    deleteBudget,
    importData,
    clearAllData,
    retrySync: syncNow,
    retryMigration: finishMigration,
  }
}
