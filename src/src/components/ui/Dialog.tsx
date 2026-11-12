import { useEffect, useId, useRef, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  className?: string
}

export function Dialog({ open, title, onClose, children, className = '' }: DialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])
  return (
    <dialog ref={dialogRef} className={`dialog ${className}`} aria-labelledby={titleId} onClose={onClose} onCancel={(event) => { event.preventDefault(); onClose() }}>
      <div className="dialog-heading">
        <h2 id={titleId}>{title}</h2>
        <button className="icon-button" type="button" aria-label="Cerrar ventana" onClick={onClose}><X size={20} /></button>
      </div>
      {children}
    </dialog>
  )
}
