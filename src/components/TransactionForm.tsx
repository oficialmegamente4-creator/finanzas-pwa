import { useState, type FormEvent } from 'react'
import { ArrowDownLeft, ArrowUpRight, CalendarDays, CircleDollarSign, Plus } from 'lucide-react'
import { getCategories, isValidCategory } from '../constants/categories'
import { localDateString } from '../lib/dates'
import { parseAmountToCents } from '../lib/money'
import type { Transaction, TransactionType } from '../types'
import { parseLocalDate } from '../lib/dates'

interface TransactionFormProps {
  currency: string
  transaction?: Transaction | null
  initialType?: TransactionType
  onSave: (transaction: Transaction) => void | Promise<void>
  onCancel?: () => void
}

interface FormErrors {
  description?: string
  amount?: string
  category?: string
  date?: string
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `mov-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function TransactionForm({ currency, transaction, initialType = 'expense', onSave, onCancel }: TransactionFormProps) {
  const [type, setType] = useState<TransactionType>(transaction?.type ?? initialType)
  const [description, setDescription] = useState(transaction?.description ?? '')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount).replace('.', ',') : '')
  const [category, setCategory] = useState(transaction?.category ?? getCategories(transaction?.type ?? initialType)[0]?.name ?? '')
  const [date, setDate] = useState(transaction?.date ?? localDateString())
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')
  const [saving, setSaving] = useState(false)
  const [draftId] = useState(() => transaction?.id ?? createId())
  const editing = Boolean(transaction)

  const changeType = (next: TransactionType) => {
    setType(next)
    if (!isValidCategory(next, category)) setCategory(getCategories(next)[0]?.name ?? '')
    setErrors((current) => ({ ...current, category: undefined }))
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const nextErrors: FormErrors = {}
    const cleanDescription = description.trim()
    const cents = parseAmountToCents(amount)
    if (!cleanDescription || cleanDescription.length > 80) nextErrors.description = 'Escribe una descripción de 1 a 80 caracteres.'
    if (cents === null) nextErrors.amount = 'Ingresa un monto mayor que cero, con máximo dos decimales.'
    if (!isValidCategory(type, category)) nextErrors.category = 'Elige una categoría válida para este tipo.'
    if (!date || !parseLocalDate(date)) nextErrors.date = 'Elige una fecha válida.'
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length > 0 || cents === null) return
    setSaving(true)
    setSubmitError('')
    try {
      await onSave({
        id: draftId,
        type,
        description: cleanDescription,
        amount: cents / 100,
        category,
        date,
        createdAt: transaction?.createdAt ?? new Date().toISOString(),
      })
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'No se pudo guardar el movimiento.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form className="transaction-form" onSubmit={(event) => void submit(event)} noValidate aria-busy={saving}>
      <div className="field-group">
        <span className="field-label" id="transaction-type-label">Tipo de movimiento</span>
        <div className="segmented-control" role="group" aria-labelledby="transaction-type-label">
          <button type="button" className={type === 'expense' ? 'segment active expense-segment' : 'segment'} aria-pressed={type === 'expense'} onClick={() => changeType('expense')}><ArrowUpRight size={17} />Gasto</button>
          <button type="button" className={type === 'income' ? 'segment active income-segment' : 'segment'} aria-pressed={type === 'income'} onClick={() => changeType('income')}><ArrowDownLeft size={17} />Ingreso</button>
        </div>
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="transaction-description">Descripción</label>
        <input id="transaction-description" className="text-input" type="text" value={description} maxLength={80} autoComplete="off" placeholder="Ej. Mercado de la semana" aria-invalid={Boolean(errors.description)} aria-describedby={errors.description ? 'description-error' : undefined} onChange={(event) => setDescription(event.target.value)} />
        {errors.description && <span className="field-error" id="description-error" role="alert">{errors.description}</span>}
      </div>
      <div className="field-row">
        <div className="field-group">
          <label className="field-label" htmlFor="transaction-amount">Monto <span className="field-hint">({currency})</span></label>
          <div className="input-with-icon"><CircleDollarSign size={18} aria-hidden="true" /><input id="transaction-amount" className="text-input" type="text" inputMode="decimal" value={amount} placeholder="0,00" aria-invalid={Boolean(errors.amount)} aria-describedby={errors.amount ? 'amount-error' : undefined} onChange={(event) => setAmount(event.target.value)} /></div>
          {errors.amount && <span className="field-error" id="amount-error" role="alert">{errors.amount}</span>}
        </div>
        <div className="field-group">
          <label className="field-label" htmlFor="transaction-date">Fecha</label>
          <div className="input-with-icon"><CalendarDays size={17} aria-hidden="true" /><input id="transaction-date" className="text-input date-input" type="date" value={date} aria-invalid={Boolean(errors.date)} aria-describedby={errors.date ? 'date-error' : undefined} onChange={(event) => setDate(event.target.value)} /></div>
          {errors.date && <span className="field-error" id="date-error" role="alert">{errors.date}</span>}
        </div>
      </div>
      <div className="field-group">
        <label className="field-label" htmlFor="transaction-category">Categoría</label>
        <select id="transaction-category" className="text-input select-input" value={category} aria-invalid={Boolean(errors.category)} aria-describedby={errors.category ? 'category-error' : undefined} onChange={(event) => setCategory(event.target.value)}>
          {getCategories(type).map((item) => <option key={item.name} value={item.name}>{item.name}</option>)}
        </select>
        {errors.category && <span className="field-error" id="category-error" role="alert">{errors.category}</span>}
      </div>
      <div className="form-actions">
        {submitError && <span className="field-error form-submit-error" role="alert">{submitError}</span>}
        {onCancel && <button className="button button-secondary" type="button" disabled={saving} onClick={onCancel}>Cancelar</button>}
        <button className="button button-primary" type="submit" disabled={saving}><Plus size={18} aria-hidden="true" />{saving ? 'Guardando…' : editing ? 'Guardar cambios' : 'Registrar movimiento'}</button>
      </div>
    </form>
  )
}
