import { AlertCircle, CheckCircle2, Cloud, CloudOff, LoaderCircle, RefreshCw, Upload } from 'lucide-react'
import type { SyncStatus } from '../hooks/useTransactions'

interface CloudSyncStatusProps {
  status: SyncStatus
  error: string | null
  migrationCount: number
  migrationBlocked: boolean
  migrationError: string | null
  onRetry: () => void
  onMigrate: () => void
}

export function CloudSyncStatus({ status, error, migrationCount, migrationBlocked, migrationError, onRetry, onMigrate }: CloudSyncStatusProps) {
  if (migrationBlocked) return (
    <div className="cloud-status cloud-status-warning" role="status">
      <AlertCircle size={17} aria-hidden="true" />
      <span>Los datos locales antiguos de este dispositivo están asociados a otra cuenta. Inicia sesión con esa cuenta para migrarlos.</span>
    </div>
  )

  if (migrationCount > 0 || migrationError) return (
    <div className="cloud-status cloud-status-migration" role="status">
      <Upload size={17} aria-hidden="true" />
      <span>{migrationError ?? `Se encontraron ${migrationCount} movimientos locales. Se copiarán a esta cuenta y solo se quitarán del dispositivo después de confirmar la copia.`}</span>
      <button className="button button-small" type="button" onClick={onMigrate}><RefreshCw size={14} />Migrar ahora</button>
    </div>
  )

  if (status === 'syncing' || status === 'loading') return (
    <div className="cloud-status" role="status"><LoaderCircle className="spin-icon" size={16} aria-hidden="true" />Sincronizando con tu cuenta…</div>
  )
  if (status === 'synced') return (
    <div className="cloud-status cloud-status-success" role="status"><CheckCircle2 size={16} aria-hidden="true" />Datos sincronizados con tu cuenta</div>
  )
  if (status === 'pending' || status === 'offline') return (
    <div className="cloud-status cloud-status-warning" role="status"><CloudOff size={16} aria-hidden="true" /><span>{error ?? 'Hay cambios guardados en este dispositivo pendientes de sincronización.'}</span><button className="button button-small" type="button" onClick={onRetry}><RefreshCw size={14} />Reintentar</button></div>
  )
  return (
    <div className="cloud-status cloud-status-error" role="alert"><Cloud size={16} aria-hidden="true" /><span>{error ?? 'No se pudo sincronizar con Supabase. Los datos locales se conservaron.'}</span><button className="button button-small" type="button" onClick={onRetry}><RefreshCw size={14} />Reintentar</button></div>
  )
}
