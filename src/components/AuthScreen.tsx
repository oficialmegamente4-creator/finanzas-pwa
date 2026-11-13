import { useState, type FormEvent } from 'react'
import { ArrowLeft, KeyRound, LockKeyhole, Mail, WalletCards } from 'lucide-react'
import type { AuthController, AuthMode } from '../hooks/useAuth'

interface AuthScreenProps {
  auth: AuthController
  initialMode?: AuthMode
}

const titles: Record<AuthMode, string> = {
  'sign-in': 'Inicia sesión',
  'sign-up': 'Crea tu cuenta',
  recovery: 'Recupera tu contraseña',
  'update-password': 'Elige una contraseña nueva',
}

export function AuthScreen({ auth, initialMode = 'sign-in' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>(initialMode)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const changeMode = (nextMode: AuthMode) => {
    if (mode === 'update-password' && nextMode === 'sign-in') auth.cancelPasswordRecovery()
    setMode(nextMode)
    setError('')
    setSuccess('')
    setPassword('')
    setConfirmation('')
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setBusy(true)
    setError('')
    setSuccess('')
    try {
      if (mode === 'sign-in') {
        await auth.signIn(email, password)
      } else if (mode === 'sign-up') {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
        const result = await auth.signUp(email, password)
        if (result.confirmationRequired) setSuccess('Te enviamos un correo para confirmar tu cuenta. Después vuelve e inicia sesión.')
      } else if (mode === 'recovery') {
        await auth.requestPasswordReset(email)
        setSuccess('Si el correo corresponde a una cuenta, recibirás un enlace para cambiar la contraseña.')
      } else {
        if (password.length < 8) throw new Error('La contraseña debe tener al menos 8 caracteres.')
        if (password !== confirmation) throw new Error('Las contraseñas no coinciden.')
        await auth.updatePassword(password)
        auth.finishPasswordRecovery()
        setSuccess('Contraseña actualizada. Ya puedes continuar.')
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'No se pudo completar la solicitud. Inténtalo de nuevo.')
    } finally {
      setBusy(false)
    }
  }

  const needsEmail = mode !== 'update-password'
  const needsPassword = mode === 'sign-in' || mode === 'sign-up' || mode === 'update-password'
  const passwordLabel = mode === 'sign-in' ? 'Contraseña' : 'Contraseña nueva'

  return (
    <main className="auth-shell">
      <section className="auth-card" aria-labelledby="auth-heading">
        <div className="auth-brand"><span className="brand-mark"><WalletCards size={23} aria-hidden="true" /></span><span><strong>Finanzas</strong><small>Tus finanzas, privadas y sincronizadas</small></span></div>
        <div className="auth-heading"><p className="eyebrow">CUENTA PERSONAL</p><h1 id="auth-heading">{titles[mode]}</h1><p>{mode === 'sign-up' ? 'Crea una cuenta para guardar tus movimientos en la nube.' : mode === 'recovery' ? 'Te enviaremos un enlace a tu correo.' : mode === 'update-password' ? 'La nueva contraseña debe tener al menos 8 caracteres.' : 'Tus datos se sincronizarán en todos tus dispositivos.'}</p></div>
        <form className="auth-form" onSubmit={(event) => void submit(event)}>
          {needsEmail && <div className="auth-field"><label htmlFor="auth-email">Correo electrónico</label><span className="auth-input-wrap"><Mail size={18} aria-hidden="true" /><input id="auth-email" type="email" autoComplete="email" aria-describedby="auth-email-hint" required value={email} onInvalid={(event) => { event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? 'Escribe un correo válido que incluya @, por ejemplo tu@correo.com.' : 'Escribe tu correo electrónico.') }} onChange={(event) => { event.currentTarget.setCustomValidity(''); setEmail(event.target.value) }} placeholder="tu@correo.com" /></span><small className="auth-hint" id="auth-email-hint">Debe incluir @, por ejemplo tu@correo.com.</small></div>}
          {needsPassword && <label className="auth-field"><span>{passwordLabel}</span><span className="auth-input-wrap"><LockKeyhole size={18} aria-hidden="true" /><input type="password" autoComplete={mode === 'sign-in' ? 'current-password' : 'new-password'} minLength={8} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Mínimo 8 caracteres" /></span></label>}
          {(mode === 'sign-up' || mode === 'update-password') && <label className="auth-field"><span>Confirmar contraseña</span><span className="auth-input-wrap"><KeyRound size={18} aria-hidden="true" /><input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={(event) => setConfirmation(event.target.value)} placeholder="Escríbela otra vez" /></span></label>}
          {error && <p className="auth-alert auth-error" role="alert">{error}</p>}
          {success && <p className="auth-alert auth-success" role="status">{success}</p>}
          <button className="button button-primary auth-submit" type="submit" disabled={busy}>{busy ? 'Procesando…' : titles[mode]}</button>
        </form>
        <nav className="auth-links" aria-label="Opciones de cuenta">
          {mode === 'sign-in' && <><button type="button" onClick={() => changeMode('sign-up')}>Crear cuenta</button><button type="button" onClick={() => changeMode('recovery')}>Olvidé mi contraseña</button></>}
          {mode === 'sign-up' && <button type="button" onClick={() => changeMode('sign-in')}><ArrowLeft size={15} />Ya tengo cuenta</button>}
          {(mode === 'recovery' || mode === 'update-password') && <button type="button" onClick={() => changeMode('sign-in')}><ArrowLeft size={15} />Volver a iniciar sesión</button>}
        </nav>
        <p className="auth-privacy">Cada cuenta solo puede acceder a sus propios movimientos.</p>
      </section>
    </main>
  )
}
