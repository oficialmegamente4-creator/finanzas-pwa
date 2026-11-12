import { Settings as SettingsIcon, WalletCards } from 'lucide-react'
import { InstallButton } from './InstallButton'

interface HeaderProps {
  onSettings: () => void
  onInstallInstructions: () => void
  onMessage: (message: string) => void
}

export function Header({ onSettings, onInstallInstructions, onMessage }: HeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Finanzas, ir al inicio">
        <span className="brand-mark"><WalletCards size={23} aria-hidden="true" /></span>
        <span><strong>Finanzas</strong><small>Tu dinero, en orden</small></span>
      </a>
      <nav className="header-actions" aria-label="Acciones principales">
        <InstallButton onInstructions={onInstallInstructions} onMessage={onMessage} />
        <button className="icon-button settings-trigger" type="button" onClick={onSettings} aria-label="Abrir ajustes"><SettingsIcon size={21} /></button>
      </nav>
    </header>
  )
}
