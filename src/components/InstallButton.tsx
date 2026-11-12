import { Download } from 'lucide-react'
import { useInstallPrompt } from '../hooks/useInstallPrompt'

interface InstallButtonProps {
  onInstructions: () => void
  onMessage: (message: string) => void
}

export function InstallButton({ onInstructions, onMessage }: InstallButtonProps) {
  const { event, installed, promptInstall } = useInstallPrompt()
  if (installed) return null
  const handleInstall = async () => {
    if (!event) { onInstructions(); return }
    const result = await promptInstall()
    if (result === 'accepted') onMessage('La aplicación se está instalando.')
    else if (result === 'dismissed') onMessage('Puedes instalarla cuando quieras desde este botón.')
  }
  return <button className="button button-install" type="button" onClick={() => void handleInstall()}><Download size={17} aria-hidden="true" /><span>Instalar aplicación</span></button>
}
