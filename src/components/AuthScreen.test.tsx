import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AuthController } from '../hooks/useAuth'
import { AuthScreen } from './AuthScreen'

function makeAuth(): AuthController {
  return {
    configured: true,
    loading: false,
    session: null,
    passwordRecovery: false,
    signIn: vi.fn(async () => undefined),
    signUp: vi.fn(async () => ({ confirmationRequired: true })),
    requestPasswordReset: vi.fn(async () => undefined),
    updatePassword: vi.fn(async () => undefined),
    finishPasswordRecovery: vi.fn(),
    cancelPasswordRecovery: vi.fn(),
    signOut: vi.fn(async () => undefined),
  }
}

describe('pantalla de cuenta', () => {
  it('envía registro con correo y contraseña y avisa que debe confirmar el correo', async () => {
    const user = userEvent.setup()
    const auth = makeAuth()
    render(<AuthScreen auth={auth} />)

    await user.click(screen.getByRole('button', { name: 'Crear cuenta' }))
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.type(screen.getByLabelText('Contraseña nueva'), 'una-clave-segura')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'una-clave-segura')
    await user.click(screen.getByRole('button', { name: 'Crea tu cuenta' }))

    await waitFor(() => expect(auth.signUp).toHaveBeenCalledWith('persona@example.com', 'una-clave-segura'))
    expect(screen.getByRole('status').textContent).toContain('confirmar tu cuenta')
  })

  it('inicia sesión con correo y contraseña', async () => {
    const user = userEvent.setup()
    const auth = makeAuth()
    render(<AuthScreen auth={auth} />)

    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.type(screen.getByLabelText('Contraseña'), 'una-clave-segura')
    await user.click(screen.getByRole('button', { name: 'Inicia sesión' }))

    await waitFor(() => expect(auth.signIn).toHaveBeenCalledWith('persona@example.com', 'una-clave-segura'))
  })

  it('solicita el correo de recuperación de contraseña', async () => {
    const user = userEvent.setup()
    const auth = makeAuth()
    render(<AuthScreen auth={auth} />)

    await user.click(screen.getByRole('button', { name: 'Olvidé mi contraseña' }))
    await user.type(screen.getByLabelText('Correo electrónico'), 'persona@example.com')
    await user.click(screen.getByRole('button', { name: 'Recupera tu contraseña' }))

    await waitFor(() => expect(auth.requestPasswordReset).toHaveBeenCalledWith('persona@example.com'))
    expect(screen.getByRole('status').textContent).toContain('recibirás un enlace')
  })

  it('cambia la contraseña después del enlace de recuperación', async () => {
    const user = userEvent.setup()
    const auth = makeAuth()
    render(<AuthScreen auth={auth} initialMode="update-password" />)

    await user.type(screen.getByLabelText('Contraseña nueva'), 'otra-clave-segura')
    await user.type(screen.getByLabelText('Confirmar contraseña'), 'otra-clave-segura')
    await user.click(screen.getByRole('button', { name: 'Elige una contraseña nueva' }))

    await waitFor(() => expect(auth.updatePassword).toHaveBeenCalledWith('otra-clave-segura'))
    expect(auth.finishPasswordRecovery).toHaveBeenCalledOnce()
  })
})
