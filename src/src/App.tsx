import { useEffect, useMemo, useState } from 'react'
import { Plus } from 'lucide-react'
import { ExpenseChart } from './components/ExpenseChart'
import { Header } from './components/Header'
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

export default function App() {
  const desktop = useMediaQuery('(min-width: 1024px)')
  const online = useOnlineStatus()
  const pwa = usePwaStatus()
  const { transactions, settings, storageError, addTransaction, updateTransaction, deleteTransaction, restoreTransaction, importData, clearTransactions, updateSettings } = useTransactions()
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

  const saveTransaction = (transaction: Transaction) => {
    if (editing) {
      updateTransaction(transaction)
      showToast('Movimiento actualizado.')
    } else {
      addTransaction(transaction)
      showToast('Movimiento registrado.')
    }
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

  const removeTransaction = (id: string) => {
    const deleted = deleteTransaction(id)
    if (deleted) deletedToast(deleted, restoreTransaction)
  }

  const handleImport = (data: BackupData, mode: 'replace' | 'merge') => {
    importData({ transactions: data.transactions, settings: data.settings, mode })
  }

  const handleClear = () => {
    clearTransactions()
    setFilters({ type: 'all', category: '', search: '' })
    setEditing(null)
  }

  const hasFilters = filters.type !== 'all' || Boolean(filters.category) || Boolean(filters.search.trim())

  return (
    <div className="app-shell" id="inicio">
      <Header onSettings={() => setSettingsOpen(true)} onInstallInstructions={() => setInstallHelpOpen(true)} onMessage={showToast} />
      <PwaStatus online={online} ready={pwa.ready} needsRefresh={pwa.needsRefresh} onUpdate={pwa.update} />
      <main className="dashboard-layout">
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
      </main>
      {!desktop && <button className="floating-create" type="button" onClick={() => startNewTransaction()}><Plus size={21} aria-hidden="true" /><span>Nueva transacción</span></button>}
      {!desktop && <Dialog open={formOpen} title={editing ? 'Editar movimiento' : 'Nuevo movimiento'} onClose={cancelForm} className="form-dialog">
        <TransactionForm key={formKey} currency={settings.currency} transaction={editing} initialType={formType} onSave={saveTransaction} onCancel={cancelForm} />
      </Dialog>}
      <SettingsDialog open={settingsOpen} settings={settings} transactions={transactions} onClose={() => setSettingsOpen(false)} onSettingsChange={(next: Settings) => updateSettings(next)} onImport={handleImport} onClear={handleClear} onMessage={showToast} />
      <InstallInstructionsDialog open={installHelpOpen} onClose={() => setInstallHelpOpen(false)} />
      <Toaster toast={toast} onDismiss={dismissToast} />
    </div>
  )
}
