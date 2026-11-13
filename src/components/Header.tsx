import { LogOut, Settings as SettingsIcon, WalletCards } from 'lucide-react'
import { InstallButton } from './InstallButton'

interface HeaderProps {
  onSettings: () => void
  onInstallInstructions: () => void
  onMessage: (message: string) => void
  email: string
  onSignOut: () => void
}

export function Header({ onSettings, onInstallInstructions, onMessage, email, onSignOut }: HeaderProps) {
  return (
    <header className="app-header">
      <a className="brand" href="#inicio" aria-label="Finanzas, ir al inicio">
        <span className="brand-mark"><WalletCards size={23} aria-hidden="true" /></span>
        <span><strong>Finanzas</strong><small>Tu dinero, en orden</small></span>
      </a>
      <nav className="header-actions" aria-label="Acciones principales">
        <InstallButton onInstructions={onInstallInstructions} onMessage={onMessage} />
        <span className="account-email" title={email}>{email}</span>
        <button className="button button-secondary signout-button" type="button" onClick={onSignOut}><LogOut size={17} aria-hidden="true" /><span>Salir</span></button>
        <button className="icon-button settings-trigger" type="button" onClick={onSettings} aria-label="Abrir ajustes"><SettingsIcon size={21} /></button>
      </nav>
    </header>
  )
}
