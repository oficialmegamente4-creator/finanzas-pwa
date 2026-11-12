import { Search, X } from 'lucide-react'
import { categoriesForFilter } from '../lib/selectors'
import type { Filters, Transaction } from '../types'

interface TransactionFiltersProps {
  filters: Filters
  transactions: readonly Transaction[]
  onChange: (filters: Filters) => void
}

export function TransactionFilters({ filters, transactions, onChange }: TransactionFiltersProps) {
  const categories = categoriesForFilter(transactions, filters.type)
  const hasFilters = filters.type !== 'all' || filters.category !== '' || filters.search !== ''
  const changeType = (type: Filters['type']) => onChange({ ...filters, type, category: type !== 'all' && filters.category && !categoriesForFilter(transactions, type).includes(filters.category) ? '' : filters.category })
  return (
    <div className="filters" aria-label="Filtros de movimientos">
      <div className="filter-search"><Search size={17} aria-hidden="true" /><label className="visually-hidden" htmlFor="transaction-search">Buscar movimientos</label><input id="transaction-search" type="search" value={filters.search} placeholder="Buscar movimiento" onChange={(event) => onChange({ ...filters, search: event.target.value })} /></div>
      <div className="filter-controls">
        <label className="visually-hidden" htmlFor="filter-type">Filtrar por tipo</label>
        <select id="filter-type" className="filter-select" value={filters.type} onChange={(event) => changeType(event.target.value as Filters['type'])}>
          <option value="all">Todos los tipos</option><option value="expense">Gastos</option><option value="income">Ingresos</option>
        </select>
        <label className="visually-hidden" htmlFor="filter-category">Filtrar por categoría</label>
        <select id="filter-category" className="filter-select" value={filters.category} onChange={(event) => onChange({ ...filters, category: event.target.value })}>
          <option value="">Todas las categorías</option>{categories.map((category) => <option key={category} value={category}>{category}</option>)}
        </select>
        {hasFilters && <button className="clear-filters" type="button" onClick={() => onChange({ type: 'all', category: '', search: '' })}><X size={15} />Limpiar filtros</button>}
      </div>
    </div>
  )
}
