import { useSyncExternalStore } from 'react'
import type { BeforeInstallPromptEvent } from '../types'

interface InstallState {
  event: BeforeInstallPromptEvent | null
  installed: boolean
}

let state: InstallState = {
  event: null,
  installed: typeof window !== 'undefined' && (window.matchMedia('(display-mode: standalone)').matches || ('standalone' in navigator && Boolean(navigator.standalone))),
}
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((listener) => listener())
const subscribe = (listener: () => void) => { listeners.add(listener); return () => listeners.delete(listener) }
const getSnapshot = () => state

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (event) => {
    event.preventDefault()
    state = { ...state, event }
    emit()
  })
  window.addEventListener('appinstalled', () => {
    state = { event: null, installed: true }
    emit()
  })
  const displayMode = window.matchMedia('(display-mode: standalone)')
  displayMode.addEventListener('change', (event) => {
    state = { ...state, installed: event.matches }
    emit()
  })
}

export function useInstallPrompt() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot)
  return {
    ...snapshot,
    async promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
      if (!state.event) return 'unavailable'
      const installEvent = state.event
      state = { ...state, event: null }
      emit()
      await installEvent.prompt()
      const choice = await installEvent.userChoice
      return choice.outcome
    },
  }
}
