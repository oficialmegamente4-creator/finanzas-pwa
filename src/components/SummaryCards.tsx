import { ArrowDownRight, ArrowUpRight, TrendingDown, TrendingUp } from 'lucide-react'
import { formatCents } from '../lib/money'
import type { Summary } from '../lib/selectors'

interface SummaryCardsProps {
  summary: Summary
  currency: string
}

export function SummaryCards({ summary, currency }: SummaryCardsProps) {
  const negative = summary.balanceCents < 0
  return (
    <section className="summary-section" aria-labelledby="summary-heading">
      <div className="section-heading"><div><p className="eyebrow">TU RESUMEN</p><h1 id="summary-heading">Así van tus finanzas</h1></div></div>
      <div className="summary-grid" aria-live="polite" aria-atomic="true">
        <article className="summary-card income-card">
          <div className="summary-card-heading"><span>Ingresos</span><span className="summary-icon income-icon"><ArrowDownRight size={19} /></span></div>
          <strong className="summary-amount">{formatCents(summary.incomeCents, currency)}</strong>
          <small>En el periodo seleccionado</small>
        </article>
        <article className="summary-card expense-card">
          <div className="summary-card-heading"><span>Gastos</span><span className="summary-icon expense-icon"><ArrowUpRight size={19} /></span></div>
          <strong className="summary-amount">{formatCents(summary.expenseCents, currency)}</strong>
          <small>En el periodo seleccionado</small>
        </article>
        <article className={`summary-card balance-card ${negative ? 'is-negative' : ''}`}>
          <div className="summary-card-heading"><span>Balance actual</span><span className="summary-icon balance-icon">{negative ? <TrendingDown size={19} /> : <TrendingUp size={19} />}</span></div>
          <strong className="summary-amount">{negative ? '−' : ''}{formatCents(Math.abs(summary.balanceCents), currency)}</strong>
          <small>{negative ? 'Déficit en este periodo' : 'Ingresos menos gastos'}</small>
        </article>
      </div>
      <div className="progress-panel">
        <div className="progress-copy"><span>Ingresos gastados</span><strong>{summary.expensesWithoutIncome ? 'Sin ingresos' : `${summary.spentPercent}%`}</strong></div>
        <div className="progress-track" role="meter" aria-label="Porcentaje de ingresos gastado" aria-valuemin={0} aria-valuemax={100} aria-valuenow={summary.expensesWithoutIncome ? 100 : Math.min(summary.spentPercent, 100)} aria-valuetext={summary.expensesWithoutIncome ? 'Hay gastos, pero no hay ingresos en este periodo.' : `${summary.spentPercent}% de los ingresos gastado`}>
          <span className={summary.spentPercent > 100 || summary.expensesWithoutIncome ? 'over-budget' : ''} style={{ width: `${summary.expensesWithoutIncome ? 100 : Math.min(summary.spentPercent, 100)}%` }} />
        </div>
        {summary.expensesWithoutIncome && <p className="progress-note">Hay gastos, pero todavía no hay ingresos para comparar en este periodo.</p>}
        {!summary.expensesWithoutIncome && summary.spentPercent > 100 && <p className="progress-note">Tus gastos superan tus ingresos por {summary.spentPercent - 100}%.</p>}
      </div>
    </section>
  )
}
