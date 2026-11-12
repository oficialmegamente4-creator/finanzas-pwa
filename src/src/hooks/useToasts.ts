import { useCallback, useEffect, useRef, useState } from 'react'
import type { Transaction } from '../types'

export interface ToastMessage {
  id: number
  message: string
  undo?: () => void
}

export function useToasts() {
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const nextId = useRef(0)
  const timeout = useRef<number | undefined>(undefined)
  const showToast = useCallback((message: string, undo?: () => void) => {
    window.clearTimeout(timeout.current)
    const id = ++nextId.current
    setToast({ id, message, undo })
    timeout.current = window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 6000)
  }, [])
  const dismissToast = useCallback(() => {
    window.clearTimeout(timeout.current)
    setToast(null)
  }, [])
  const deletedToast = useCallback((transaction: Transaction, restore: (item: Transaction) => void) => {
    showToast(`Se eliminó “${transaction.description}”.`, () => restore(transaction))
  }, [showToast])
  useEffect(() => () => window.clearTimeout(timeout.current), [])
  return { toast, showToast, dismissToast, deletedToast }
}
