import { useState } from 'react'
import { SearchX, WalletCards } from 'lucide-react'
import { relativeDateLabel } from '../lib/dates'
import { TransactionItem } from './TransactionItem'
import type { Transaction } from '../types'

interface TransactionListProps {
  transactions: Transaction[]
  totalResults: number
  isFiltered: boolean
  currency: string
  onEdit: (transaction: Transaction) => void
  onDelete: (id: string) => void
  onCreate: () => void
}

export function TransactionList({ transactions, totalResults, isFiltered, currency, onEdit, onDelete, onCreate }: TransactionListProps) {
  const [visibleCount, setVisibleCount] = useState(30)
  const visibleTransactions = transactions.slice(0, visibleCount)
  const groups = visibleTransactions.reduce<Array<{ date: string; items: Transaction[] }>>((all, item) => {
    const current = all[all.length - 1]
    if (current?.date === item.date) current.items.push(item)
    else all.push({ date: item.date, items: [item] })
    return all
  }, [])
  return (
    <section className="panel transaction-history" aria-labelledby="history-heading">
      <div className="panel-heading history-heading"><div><p className="eyebrow">MOVIMIENTOS</p><h2 id="history-heading">Historial <span className="result-count" aria-live="polite">{totalResults}</span></h2></div></div>
      {!transactions.length ? (
        <div className="history-empty">
          <div className="empty-illustration">{totalResults ? <SearchX size={26} /> : <WalletCards size={26} />}</div>
          <h3>{isFiltered ? 'No hay movimientos con esos filtros' : 'Todavía no hay movimientos'}</h3>
          <p>{isFiltered ? 'Prueba otra búsqueda o limpia los filtros.' : 'Registra tu primer ingreso o gasto para empezar.'}</p>
          {!isFiltered && <button className="button button-primary" type="button" onClick={onCreate}>Registrar movimiento</button>}
        </div>
      ) : (
        <>
          <div className="history-groups">
            {groups.map((group) => <section className="date-group" key={group.date} aria-label={relativeDateLabel(group.date)}><h3>{relativeDateLabel(group.date)}</h3><ul>{group.items.map((transaction) => <TransactionItem key={transaction.id} transaction={transaction} currency={currency} onEdit={onEdit} onDelete={onDelete} />)}</ul></section>)}
          </div>
          {visibleCount < transactions.length && <button className="button button-secondary show-more" type="button" onClick={() => setVisibleCount((count) => count + 30)}>Ver más movimientos</button>}
        </>
      )}
    </section>
  )
}
