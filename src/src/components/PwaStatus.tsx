import { CheckCircle2, CloudOff, RefreshCw, Wifi, WifiOff } from 'lucide-react'

interface PwaStatusProps {
  online: boolean
  ready: boolean
  needsRefresh: boolean
  onUpdate: () => void
}

export function PwaStatus({ online, ready, needsRefresh, onUpdate }: PwaStatusProps) {
  return (
    <div className="pwa-status" aria-live="polite">
      <span className={online ? 'connection-status is-online' : 'connection-status is-offline'}><span className="status-dot" />{online ? <><Wifi size={14} />En línea</> : <><WifiOff size={14} />Sin conexión</>}</span>
      {!online && <span className="status-message"><CloudOff size={14} />Puedes seguir usando tus datos guardados.</span>}
      {online && ready && <span className="status-message ready-message"><CheckCircle2 size={14} />Lista para usar sin conexión</span>}
      {needsRefresh && <span className="update-message">Nueva versión disponible <button className="button button-small" type="button" onClick={onUpdate}><RefreshCw size={13} />Actualizar</button></span>}
    </div>
  )
}
