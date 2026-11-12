import { useCallback, useEffect, useReducer, useRef } from 'react'
import { DEFAULT_SETTINGS, readStoredSettings, readStoredTransactions, saveStoredSettings, saveStoredTransactions } from '../lib/storage'
import type { Settings, Transaction } from '../types'

interface State {
  transactions: Transaction[]
  settings: Settings
  storageError: string | null
}

type Action =
  | { type: 'ADD'; transaction: Transaction }
  | { type: 'UPDATE'; transaction: Transaction }
  | { type: 'DELETE'; id: string }
  | { type: 'RESTORE'; transaction: Transaction }
  | { type: 'IMPORT'; transactions: Transaction[]; settings: Settings; mode: 'replace' | 'merge' }
  | { type: 'CLEAR' }
  | { type: 'SET_SETTINGS'; settings: Settings }
  | { type: 'STORAGE_SYNC'; transactions: Transaction[]; settings: Settings }
  | { type: 'STORAGE_ERROR'; message: string | null }

function initialState(): State {
  const transactions = readStoredTransactions()
  const settings = readStoredSettings()
  return { transactions: transactions.data, settings: settings.data, storageError: transactions.error ?? settings.error }
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'ADD': return { ...state, transactions: [action.transaction, ...state.transactions], storageError: null }
    case 'UPDATE': return { ...state, transactions: state.transactions.map((item) => item.id === action.transaction.id ? action.transaction : item), storageError: null }
    case 'DELETE': return { ...state, transactions: state.transactions.filter((item) => item.id !== action.id), storageError: null }
    case 'RESTORE': return { ...state, transactions: [action.transaction, ...state.transactions.filter((item) => item.id !== action.transaction.id)], storageError: null }
    case 'IMPORT': {
      const transactions = action.mode === 'replace'
        ? action.transactions
        : [...action.transactions, ...state.transactions.filter((item) => !action.transactions.some((incoming) => incoming.id === item.id))]
      return { ...state, transactions, settings: action.settings, storageError: null }
    }
    case 'CLEAR': return { ...state, transactions: [], settings: DEFAULT_SETTINGS, storageError: null }
    case 'SET_SETTINGS': return { ...state, settings: action.settings, storageError: null }
    case 'STORAGE_SYNC': return { ...state, transactions: action.transactions, settings: action.settings }
    case 'STORAGE_ERROR': return { ...state, storageError: action.message }
    default: return state
  }
}

export interface ImportPayload {
  transactions: Transaction[]
  settings: Settings
  mode: 'replace' | 'merge'
}

export function useTransactions() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const persistRequested = useRef(false)

  useEffect(() => {
    const saved = saveStoredTransactions(state.transactions)
    if (!saved) dispatch({ type: 'STORAGE_ERROR', message: 'No se pudo guardar. Revisa el espacio disponible y los permisos del navegador.' })
    else if (state.transactions.length > 0 && !persistRequested.current) {
      persistRequested.current = true
      try { void navigator.storage?.persist?.().catch(() => undefined) } catch { /* La persistencia extendida no está disponible en todos los navegadores. */ }
    }
  }, [state.transactions])

  useEffect(() => {
    const saved = saveStoredSettings(state.settings)
    if (!saved) dispatch({ type: 'STORAGE_ERROR', message: 'No se pudieron guardar los ajustes en este dispositivo.' })
  }, [state.settings])

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== 'finanzas:v1:transactions' && event.key !== 'finanzas:v1:settings') return
      const transactions = readStoredTransactions().data
      const settings = readStoredSettings().data
      dispatch({ type: 'STORAGE_SYNC', transactions, settings })
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  const addTransaction = useCallback((transaction: Transaction) => {
    dispatch({ type: 'ADD', transaction })
  }, [])
  const updateTransaction = useCallback((transaction: Transaction) => dispatch({ type: 'UPDATE', transaction }), [])
  const deleteTransaction = useCallback((id: string): Transaction | null => {
    const deleted = state.transactions.find((item) => item.id === id) ?? null
    if (deleted) dispatch({ type: 'DELETE', id })
    return deleted
  }, [state.transactions])
  const restoreTransaction = useCallback((transaction: Transaction) => dispatch({ type: 'RESTORE', transaction }), [])
  const importData = useCallback((payload: ImportPayload) => dispatch({ type: 'IMPORT', ...payload }), [])
  const clearTransactions = useCallback(() => dispatch({ type: 'CLEAR' }), [])
  const updateSettings = useCallback((settings: Settings) => dispatch({ type: 'SET_SETTINGS', settings }), [])
  const clearStorageError = useCallback(() => dispatch({ type: 'STORAGE_ERROR', message: null }), [])

  return {
    transactions: state.transactions,
    settings: state.settings ?? DEFAULT_SETTINGS,
    storageError: state.storageError,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    restoreTransaction,
    importData,
    clearTransactions,
    updateSettings,
    clearStorageError,
  }
}
