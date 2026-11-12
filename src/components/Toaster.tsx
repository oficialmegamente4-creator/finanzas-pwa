import { Check, Undo2, X } from 'lucide-react'
import type { ToastMessage } from '../hooks/useToasts'

interface ToasterProps {
  toast: ToastMessage | null
  onDismiss: () => void
}

export function Toaster({ toast, onDismiss }: ToasterProps) {
  if (!toast) return null
  const undo = () => { toast.undo?.(); onDismiss() }
  return <div className="toast" role="status" aria-live="polite"><span className="toast-check"><Check size={16} /></span><span>{toast.message}</span>{toast.undo && <button className="toast-undo" type="button" onClick={undo}><Undo2 size={15} />Deshacer</button>}<button className="toast-close" type="button" aria-label="Cerrar aviso" onClick={onDismiss}><X size={17} /></button></div>
}
