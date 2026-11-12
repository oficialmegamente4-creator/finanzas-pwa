import { useRef, useState, type ChangeEvent } from 'react'
import { FileJson, FileSpreadsheet, Trash2, Upload } from 'lucide-react'
import { createBackup, createCsv, downloadTextFile, parseBackup, type BackupData } from '../lib/backup'
import { CURRENCIES } from '../lib/money'
import type { Settings, Transaction } from '../types'
import { Dialog } from './ui/Dialog'

interface SettingsDialogProps {
  open: boolean
  settings: Settings
  transactions: Transaction[]
  onClose: () => void
  onSettingsChange: (settings: Settings) => void
  onImport: (data: BackupData, mode: 'replace' | 'merge') => void
  onClear: () => void
  onMessage: (message: string) => void
}

export function SettingsDialog({ open, settings, transactions, onClose, onSettingsChange, onImport, onClear, onMessage }: SettingsDialogProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [importMode, setImportMode] = useState<'replace' | 'merge'>('replace')
  const [importError, setImportError] = useState('')
  const [confirmClear, setConfirmClear] = useState(false)

  const handleFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    setImportError('')
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setImportError('El archivo supera el límite de 5 MB.'); event.target.value = ''; return }
    try {
      const backup = parseBackup(await file.text())
      onImport(backup, importMode)
      onMessage(importMode === 'replace' ? 'Respaldo importado. Se reemplazaron los movimientos.' : 'Respaldo combinado con los movimientos existentes.')
      event.target.value = ''
    } catch (error) {
      setImportError(error instanceof Error ? error.message : 'No se pudo leer el archivo.')
      event.target.value = ''
    }
  }

  return (
    <Dialog open={open} title="Ajustes" onClose={onClose} className="settings-dialog">
      <div className="settings-content">
        <section className="settings-section" aria-labelledby="appearance-heading"><h3 id="appearance-heading">Apariencia</h3>
          <label className="field-label" htmlFor="theme-select">Tema</label><select id="theme-select" className="text-input" value={settings.theme} onChange={(event) => onSettingsChange({ ...settings, theme: event.target.value as Settings['theme'] })}><option value="system">Según el dispositivo</option><option value="light">Claro</option><option value="dark">Oscuro</option></select>
        </section>
        <section className="settings-section" aria-labelledby="currency-heading"><h3 id="currency-heading">Moneda</h3>
          <label className="field-label" htmlFor="currency-select">Moneda para los nuevos resúmenes</label><select id="currency-select" className="text-input" value={settings.currency} onChange={(event) => onSettingsChange({ ...settings, currency: event.target.value })}>{CURRENCIES.map((currency) => <option key={currency} value={currency}>{currency}</option>)}</select>
        </section>
        <section className="settings-section" aria-labelledby="export-heading"><h3 id="export-heading">Tus datos</h3>
          <p className="settings-help">Los datos permanecen en este dispositivo. Guarda un respaldo para trasladarlos o tener una copia.</p>
          <div className="settings-actions"><button className="button button-secondary" type="button" onClick={() => { downloadTextFile(`finanzas-respaldo-${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify(createBackup(transactions, settings), null, 2), 'application/json'); onMessage('Respaldo JSON descargado.') }}><FileJson size={17} />Exportar respaldo</button><button className="button button-secondary" type="button" onClick={() => { downloadTextFile(`finanzas-movimientos-${new Date().toISOString().slice(0, 10)}.csv`, createCsv(transactions), 'text/csv;charset=utf-8'); onMessage('Archivo CSV descargado.') }}><FileSpreadsheet size={17} />Exportar CSV</button></div>
        </section>
        <section className="settings-section" aria-labelledby="import-heading"><h3 id="import-heading">Importar respaldo JSON</h3>
          <label className="field-label" htmlFor="import-mode">Al importar</label><select id="import-mode" className="text-input" value={importMode} onChange={(event) => setImportMode(event.target.value as 'replace' | 'merge')}><option value="replace">Reemplazar mis movimientos</option><option value="merge">Combinar por identificador</option></select>
          <input ref={fileRef} className="visually-hidden" type="file" accept="application/json,.json" aria-label="Seleccionar archivo JSON" onChange={(event) => void handleFile(event)} />
          <button className="button button-secondary import-button" type="button" onClick={() => fileRef.current?.click()}><Upload size={17} />Elegir archivo JSON</button>
          {importError && <p className="field-error" role="alert">{importError}</p>}
        </section>
        <section className="settings-section danger-zone" aria-labelledby="clear-heading"><h3 id="clear-heading">Borrar todos los datos</h3>
          {!confirmClear ? <button className="button button-danger" type="button" onClick={() => setConfirmClear(true)}>Borrar todos los datos</button> : <div className="clear-confirm" role="alert"><p>Se borrarán movimientos y ajustes guardados en este dispositivo. Esta acción no se puede deshacer.</p><div><button className="button button-secondary" type="button" onClick={() => setConfirmClear(false)}>Cancelar</button><button className="button button-danger" type="button" onClick={() => { onClear(); setConfirmClear(false); onClose(); onMessage('Se borraron todos los datos.') }}><Trash2 size={16} />Confirmar borrado</button></div></div>}
        </section>
        <p className="privacy-note">Tus movimientos no salen de este dispositivo ni se sincronizan con otros.</p>
      </div>
    </Dialog>
  )
}
