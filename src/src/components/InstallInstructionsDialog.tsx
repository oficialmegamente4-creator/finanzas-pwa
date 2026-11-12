import { Dialog } from './ui/Dialog'

interface InstallInstructionsDialogProps {
  open: boolean
  onClose: () => void
}

function installationSteps(): { title: string; steps: string[] } {
  const ua = navigator.userAgent.toLowerCase()
  const isIos = /iphone|ipad|ipod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  if (isIos) return { title: 'Instalar en iPhone o iPad', steps: ['Abre esta página en Safari.', 'Toca Compartir en la barra del navegador.', 'Elige “Añadir a pantalla de inicio” y confirma.'] }
  if (/android/.test(ua)) return { title: 'Instalar en Android', steps: ['Abre esta página en Chrome.', 'Toca el menú ⋮ de la esquina superior.', 'Elige “Instalar aplicación” o “Añadir a pantalla de inicio”.'] }
  if (/firefox/.test(ua)) return { title: 'Abrir como aplicación', steps: ['Firefox de escritorio no ofrece instalación de esta app.', 'Abre Finanzas en Chrome o Edge.', 'Usa el icono de instalación de la barra de direcciones o el menú del navegador.'] }
  if (/safari/.test(ua) && !/chrome|chromium|android/.test(ua)) return { title: 'Instalar en macOS', steps: ['Abre esta página en Safari.', 'En el menú Archivo, elige “Añadir al Dock”.', 'Confirma el nombre de la aplicación.'] }
  return { title: 'Instalar en tu computador', steps: ['En Chrome o Edge, busca el icono de instalación en la barra de direcciones.', 'También puedes abrir el menú del navegador y elegir “Instalar Finanzas”.', 'Confirma para abrir Finanzas desde el escritorio.'] }
}

export function InstallInstructionsDialog({ open, onClose }: InstallInstructionsDialogProps) {
  const instructions = installationSteps()
  return (
    <Dialog open={open} title={instructions.title} onClose={onClose}>
      <div className="dialog-content"><p>Instala Finanzas para abrirla como una aplicación y usarla sin conexión.</p><ol className="instruction-list">{instructions.steps.map((step) => <li key={step}>{step}</li>)}</ol><button className="button button-primary full-width" type="button" onClick={onClose}>Entendido</button></div>
    </Dialog>
  )
}
