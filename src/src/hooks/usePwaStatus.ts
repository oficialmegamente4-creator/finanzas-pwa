import { useEffect, useRef, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'

export function usePwaStatus() {
  const [ready, setReady] = useState(false)
  const [needsRefresh, setNeedsRefresh] = useState(false)
  const updateTimer = useRef<number | null>(null)
  const { updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (!registration) return
      if (updateTimer.current !== null) window.clearInterval(updateTimer.current)
      updateTimer.current = window.setInterval(() => { void registration.update() }, 60 * 60 * 1000)
    },
    onOfflineReady() { setReady(true) },
    onNeedRefresh() { setNeedsRefresh(true) },
  })
  useEffect(() => () => {
    if (updateTimer.current !== null) window.clearInterval(updateTimer.current)
  }, [])
  return { ready, needsRefresh, update: () => updateServiceWorker(true) }
}
