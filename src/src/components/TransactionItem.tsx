import { Pencil, Trash2 } from 'lucide-react'
import { CATEGORIES } from '../constants/categories'
import { formatLongDate } from '../lib/dates'
import { formatMoney } from '../lib/money'
import type { Transaction } from '../types'
import type { CSSProperties } from 'react'

interface TransactionItemProps {
  transaction: Transaction
  currency: string
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
}

export function TransactionItem({ transaction, currency, onEdit, onDelete }: TransactionItemProps) {
  const category = CATEGORIES.find((item) => item.name === transaction.category && item.type === transaction.type)
  const Icon = category?.icon
  const income = transaction.type === 'income'
  return (
    <li className="transaction-row">
      <span className="transaction-icon" style={{ '--category-color': category?.color ?? '#64748b' } as CSSProperties}>{Icon ? <Icon size={19} aria-hidden="true" /> : null}</span>
      <div className="transaction-main"><strong>{transaction.description}</strong><span>{transaction.category} · {formatLongDate(transaction.date)}</span></div>
      <strong className={`transaction-amount ${income ? 'positive' : 'negative'}`}>{income ? '+' : '−'}{formatMoney(transaction.amount, currency)}</strong>
      <div className="transaction-actions">
        <button className="icon-button row-action" type="button" aria-label={`Editar ${transaction.description}`} onClick={() => onEdit(transaction)}><Pencil size={17} /></button>
        <button className="icon-button row-action delete-action" type="button" aria-label={`Eliminar ${transaction.description}`} onClick={() => onDelete(transaction.id)}><Trash2 size={17} /></button>
      </div>
      <span className="visually-hidden">{income ? 'Ingreso' : 'Gasto'}</span>
    </li>
  )
}
