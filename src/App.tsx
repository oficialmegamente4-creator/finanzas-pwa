import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { ExpenseChart } from './components/ExpenseChart'
import { Header } from './components/Header'
import { AuthScreen } from './components/AuthScreen'
import { CloudSyncStatus } from './components/CloudSyncStatus'
import { InstallInstructionsDialog } from './components/InstallInstructionsDialog'
import { PeriodSelector } from './components/PeriodSelector'
import { PwaStatus } from './components/PwaStatus'
import { SettingsDialog } from './components/SettingsDialog'
import { SummaryCards } from './components/SummaryCards'
import { Toaster } from './components/Toaster'
import { TransactionFilters } from './components/TransactionFilters'
import { TransactionForm } from './components/TransactionForm'
import { TransactionList } from './components/TransactionList'
import { Dialog } from './components/ui/Dialog'
import { useMediaQuery } from './hooks/useMediaQuery'
import { useOnlineStatus } from './hooks/useOnlineStatus'
import { usePwaStatus } from './hooks/usePwaStatus'
import { useTheme } from './hooks/useTheme'
import { useToasts } from './hooks/useToasts'
import { useTransactions } from './hooks/useTransactions'
import { useAuth } from './hooks/useAuth'
import type { MutationResult } from './hooks/useTransactions'
import { selectExpenseDistribution, selectFilteredTransactions, selectPeriodTransactions, selectSummary } from './lib/selectors'
import type { BackupData } from './lib/backup'
import type { Filters, Period, Settings, Transaction, TransactionType } from './types'

const initialPeriod = (): Period => {
  const now = new Date()
  return { kind: 'month', year: now.getFullYear(), month: now.getMonth() }
}

const shortcutType = (): TransactionType => {
  const type = new URLSearchParams(window.location.search).get('tipo')
  return type === 'ingreso' ? 'income' : 'expense'
}

const hasShortcut = (): boolean => ['gasto', 'ingreso'].includes(new URLSearchParams(window.location.search).get('tipo') ?? '')

function SupabaseSetupMessage() {
  return <main className="auth-shell"><section className="auth-card config-card"><div className="auth-brand"><span className="brand-mark"><Plus size={22} /></span><strong>Finanzas</strong></div><p className="eyebrow">FALTA CONFIGURAR SUPABASE</p><h1>Conecta tu proyecto</h1><p>Esta publicación no tiene la URL y la clave publicable de Supabase. Añade <code>VITE_SUPABASE_URL</code> y <code>VITE_SUPABASE_PUBLISHABLE_KEY</code> en un archivo <code>.env.local</code> para desarrollo, y en las variables de GitHub Actions para publicar.</p><p>Usa únicamente la clave publicable. Nunca pongas una clave secreta o <code>service_role</code> en el frontend.</p></section></main>
}

function AuthLoadingScreen() {
  return <main className="auth-shell"><section className="auth-card" role="status"><div className="auth-brand"><span className="brand-mark"><Plus size={22} /></span><strong>Finanzas</strong></div><p>Comprobando tu sesión segura…</p></section></main>
}

export default function App() {
  const auth = useAuth()
  if (!auth.configured) return <SupabaseSetupMessage />
  if (auth.loading) return <AuthLoadingScreen />
  if (auth.passwordRecovery) return <AuthScreen key="password-recovery" auth={auth} initialMode="update-password" />
  if (!auth.session) return <AuthScreen key="sign-in" auth={auth} />
  return <FinanceDashboard key={auth.session.user.id} userId={auth.session.user.id} email={auth.session.user.email ?? ''} signOut={auth.signOut} />
}

interface FinanceDashboardProps {
  userId: string
  email: string
  signOut: () => Promise<void>
}

function FinanceDashboard({ userId, email, signOut }: FinanceDashboardProps) {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const online = useOnlineStatus()
  const pwa = usePwaStatus()
  const { transactions, budgets, settings, loading, syncStatus, syncError, storageError, migrationCount, migrationBlocked, migrationError, addTransaction, updateTransaction, deleteTransaction, restoreTransaction, importData, clearAllData, updateSettings, retrySync, retryMigration } = useTransactions(userId)
  const { toast, showToast, dismissToast, deletedToast } = useToasts()
  const [period, setPeriod] = useState<Period>(initialPeriod)
  const [filters, setFilters] = useState<Filters>({ type: 'all', category: '', search: '' })
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [formOpen, setFormOpen] = useState(() => hasShortcut() && !window.matchMedia('(min-width: 1024px)').matches)
  const [formType, setFormType] = useState<TransactionType>(shortcutType)
  const [formKey, setFormKey] = useState(0)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [installHelpOpen, setInstallHelpOpen] = useState(false)

  useTheme(settings.theme)
  const periodTransactions = useMemo(() => selectPeriodTransactions(transactions, period), [transactions, period])
  const summary = useMemo(() => selectSummary(periodTransactions), [periodTransactions])
  const expenseSlices = useMemo(() => selectExpenseDistribution(periodTransactions), [periodTransactions])
  const filteredTransactions = useMemo(() => selectFilteredTransactions(periodTransactions, filters), [periodTransactions, filters])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const shortcutType = params.get('tipo')
    if (shortcutType === 'gasto' || shortcutType === 'ingreso') {
      params.delete('tipo')
      const query = params.toString()
      window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
    }
  }, [])

  useEffect(() => {
    if (storageError) showToast(storageError)
  }, [storageError, showToast])

  const startNewTransaction = (type: TransactionType = 'expense') => {
    setEditing(null)
    setFormType(type)
    setFormKey((key) => key + 1)
    if (!desktop) setFormOpen(true)
  }

  const cancelForm = () => {
    setEditing(null)
    setFormKey((key) => key + 1)
    setFormOpen(false)
  }

  const saveTransaction = async (transaction: Transaction) => {
    const result: MutationResult = editing ? await updateTransaction(transaction) : await addTransaction(transaction)
    if (!result.ok) { showToast(result.error ?? 'No se pudo guardar el movimiento.'); return }
    showToast(result.synced ? (editing ? 'Movimiento actualizado y sincronizado.' : 'Movimiento registrado y sincronizado.') : 'Movimiento guardado en este dispositivo; se sincronizará al recuperar la conexión.')
    setEditing(null)
    setFormKey((key) => key + 1)
    setFormOpen(false)
  }

  const editTransaction = (transaction: Transaction) => {
    setEditing(transaction)
    setFormType(transaction.type)
    setFormKey((key) => key + 1)
    if (!desktop) setFormOpen(true)
  }

  const removeTransaction = async (id: string) => {
    const result = await deleteTransaction(id)
    if (result.transaction) deletedToast(result.transaction, (item) => { void restoreTransaction(item) })
    else if (result.error) showToast(result.error)
  }

  const handleImport = (data: BackupData, mode: 'replace' | 'merge') => {
    return importData({ transactions: data.transactions, budgets: data.budgets ?? [], settings: data.settings, mode })
  }

  const handleClear = () => {
    setFilters({ type: 'all', category: '', search: '' })
    setEditing(null)
    return clearAllData()
  }

  const handleSignOut = async () => {
    try { await signOut() } catch (error) { showToast(error instanceof Error ? error.message : 'No se pudo cerrar la sesión.') }
  }

  const hasFilters = filters.type !== 'all' || Boolean(filters.category) || Boolean(filters.search.trim())

  return (
    <div className="app-shell" id="inicio">
      <Header email={email} onSignOut={() => { void handleSignOut() }} onSettings={() => setSettingsOpen(true)} onInstallInstructions={() => setInstallHelpOpen(true)} onMessage={showToast} />
      <PwaStatus online={online} ready={pwa.ready} needsRefresh={pwa.needsRefresh} onUpdate={pwa.update} />
      <CloudSyncStatus status={syncStatus} error={syncError ?? storageError} migrationCount={migrationCount} migrationBlocked={migrationBlocked} migrationError={migrationError} onRetry={() => { void retrySync() }} onMigrate={() => { void retryMigration() }} />
      {loading ? <main className="dashboard-layout"><section className="panel cloud-loading" role="status">Cargando los movimientos de tu cuenta…</section></main> : <main className="dashboard-layout">
        <div className="left-column">
          {desktop && <section className="panel form-panel" aria-labelledby="form-heading"><div className="panel-heading"><div><p className="eyebrow">REGISTRO RÁPIDO</p><h2 id="form-heading">{editing ? 'Editar movimiento' : 'Nuevo movimiento'}</h2></div></div><TransactionForm key={formKey} currency={settings.currency} transaction={editing} initialType={formType} onSave={saveTransaction} onCancel={editing ? cancelForm : undefined} /></section>}
          <ExpenseChart slices={expenseSlices} currency={settings.currency} />
        </div>
        <div className="right-column">
          <SummaryCards summary={summary} currency={settings.currency} />
          <PeriodSelector period={period} onChange={setPeriod} />
          <section className="history-panel" aria-label="Historial de movimientos">
            <TransactionFilters filters={filters} transactions={periodTransactions} onChange={setFilters} />
            <TransactionList transactions={filteredTransactions} totalResults={filteredTransactions.length} isFiltered={hasFilters} currency={settings.currency} onEdit={editTransaction} onDelete={removeTransaction} onCreate={() => startNewTransaction()} />
          </section>
        </div>
      </main>}
      {!desktop && <button className="floating-create" type="button" onClick={() => startNewTransaction()}><Plus size={21} aria-hidden="true" /><span>Nueva transacción</span></button>}
      {!desktop && <Dialog open={formOpen} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={cancelForm} className="form-dialog">
        <TransactionForm key={formKey} currency={settings.currency} transaction={editing} initialType={formType} onSave={saveTransaction} onCancel={cancelForm} />
      </Dialog>}
      <SettingsDialog open={settingsOpen} settings={settings} transactions={transactions} budgets={budgets} onClose={() => setSettingsOpen(false)} onSettingsChange={(next: Settings) => { void updateSettings(next) }} onImport={handleImport} onClear={handleClear} onMessage={showToast} />
      <InstallInstructionsDialog open={installHelpOpen} onClose={() => setInstallHelpOpen(false)} />
      <Toaster toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
