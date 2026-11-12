import { PieChart } from 'lucide-react'
import { formatCents } from '../lib/money'
import type { ExpenseSlice } from '../lib/selectors'

interface ExpenseChartProps {
  slices: ExpenseSlice[]
  currency: string
}

export function ExpenseChart({ slices, currency }: ExpenseChartProps) {
  const total = slices.reduce((sum, item) => sum + item.cents, 0)
  const circumference = 2 * Math.PI * 36
  const segments = slices.reduce<Array<{ slice: ExpenseSlice; offset: number; length: number }>>((all, slice) => {
    const offset = all.length ? all[all.length - 1].offset + all[all.length - 1].length : 0
    all.push({ slice, offset, length: circumference * (slice.cents / total) })
    return all
  }, [])
  const description = slices.length ? `Distribución de gastos: ${slices.map((item) => `${item.category}, ${item.percent.toFixed(0)} por ciento`).join('; ')}.` : 'Aún no hay gastos para mostrar en este periodo.'
  return (
    <section className="panel expense-chart" aria-labelledby="chart-heading">
      <div className="panel-heading"><div><p className="eyebrow">EN QUÉ GASTAS</p><h2 id="chart-heading">Distribución de gastos</h2></div><span className="panel-heading-icon"><PieChart size={18} /></span></div>
      {slices.length === 0 ? (
        <div className="chart-empty"><div className="empty-illustration"><PieChart size={26} /></div><p>Aún no hay gastos en este periodo.</p><small>Cuando registres uno, aparecerá aquí.</small></div>
      ) : (
        <div className="chart-content">
          <div className="donut-wrap">
            <svg className="donut-chart" viewBox="0 0 100 100" role="img" aria-label={description}>
              <circle cx="50" cy="50" r="36" fill="none" stroke="var(--surface-muted)" strokeWidth="12" />
              {segments.map(({ slice, offset, length }) => <circle key={slice.category} cx="50" cy="50" r="36" fill="none" stroke={slice.color} strokeWidth="12" strokeDasharray={`${length} ${circumference - length}`} strokeDashoffset={-offset} transform="rotate(-90 50 50)" className="donut-segment" />)}
            </svg>
            <div className="donut-total"><small>Total gastado</small><strong>{formatCents(total, currency)}</strong></div>
          </div>
          <ul className="chart-legend">
            {slices.map((slice) => <li key={slice.category}><span className="legend-dot" style={{ backgroundColor: slice.color }} /><span className="legend-name">{slice.category}</span><span className="legend-percent">{Math.round(slice.percent)}%</span><strong>{formatCents(slice.cents, currency)}</strong></li>)}
          </ul>
        </div>
      )}
    </section>
  )
}
