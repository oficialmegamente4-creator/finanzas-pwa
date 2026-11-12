import { Component, type ErrorInfo, type ReactNode } from 'react'
import { AlertTriangle, RotateCw } from 'lucide-react'

interface ErrorBoundaryProps { children: ReactNode }
interface ErrorBoundaryState { hasError: boolean }

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState { return { hasError: true } }
  componentDidCatch(error: Error, info: ErrorInfo): void { console.error('Error al mostrar FinanzasPWA:', error, info.componentStack) }

  render() {
    if (this.state.hasError) return <main className="fatal-error"><div className="fatal-error-card"><AlertTriangle size={32} /><h1>Algo salió mal</h1><p>La aplicación encontró un error inesperado. Tus datos guardados siguen en este dispositivo.</p><button className="button button-primary" type="button" onClick={() => window.location.reload()}><RotateCw size={17} />Recargar aplicación</button></div></main>
    return this.props.children
  }
}
