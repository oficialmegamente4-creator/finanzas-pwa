import { ChevronLeft, ChevronRight } from 'lucide-react'
import { formatPeriod, movePeriod } from '../lib/dates'
import type { Period } from '../types'

interface PeriodSelectorProps {
  period: Period
  onChange: (period: Period) => void
}

export function PeriodSelector({ period, onChange }: PeriodSelectorProps) {
  const current = new Date()
  const isCurrentMonth = period.kind === 'month' && period.year === current.getFullYear() && period.month === current.getMonth()
  const showAll = () => onChange({ kind: 'all' })
  const showCurrent = () => onChange({ kind: 'month', year: current.getFullYear(), month: current.getMonth() })
  return (
    <section className="period-selector" aria-label="Periodo del resumen">
      <div className="period-controls">
        <button className="icon-button period-arrow" type="button" aria-label="Periodo anterior" disabled={period.kind === 'all'} onClick={() => onChange(movePeriod(period, -1))}><ChevronLeft size={19} /></button>
        <strong aria-live="polite">{formatPeriod(period)}</strong>
        <button className="icon-button period-arrow" type="button" aria-label="Periodo siguiente" disabled={period.kind === 'all' || isCurrentMonth} onClick={() => onChange(movePeriod(period, 1))}><ChevronRight size={19} /></button>
      </div>
      <div className="period-options">
        <button type="button" className={period.kind === 'month' && isCurrentMonth ? 'period-option active' : 'period-option'} onClick={showCurrent}>Este mes</button>
        <button type="button" className={period.kind === 'all' ? 'period-option active' : 'period-option'} onClick={showAll}>Todo el historial</button>
      </div>
    </section>
  )
}
