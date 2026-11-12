import type { LucideIcon } from 'lucide-react'

export const TRANSACTION_TYPES = ['income', 'expense'] as const
export type TransactionType = (typeof TRANSACTION_TYPES)[number]

export interface Transaction {
  id: string
  type: TransactionType
  description: string
  amount: number
  category: string
  date: string
  createdAt: string
}

export type Category = {
  name: string
  type: TransactionType
  color: string
  icon: LucideIcon
}

export const THEMES = ['light', 'dark', 'system'] as const
export type Theme = (typeof THEMES)[number]
export interface Settings {
  currency: string
  theme: Theme
}

export interface Filters {
  type: TransactionType | 'all'
  category: string
  search: string
}

export type Period = { kind: 'all' } | { kind: 'month'; year: number; month: number }

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent
  }
}
