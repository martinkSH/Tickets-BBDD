// ── Helpers compartidos del dashboard de Estadísticas ──────────────────────

export type Sector = 'bbdd' | 'it'

export interface PeriodPreset {
  id: string
  label: string
  range: () => { from: Date | null; to: Date }
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate())

export const PERIODOS: PeriodPreset[] = [
  { id: 'hoy',    label: 'Hoy',        range: () => ({ from: startOfDay(new Date()), to: new Date() }) },
  { id: '7d',     label: '7 días',     range: () => ({ from: new Date(Date.now() - 7 * 864e5), to: new Date() }) },
  { id: '30d',    label: '30 días',    range: () => ({ from: new Date(Date.now() - 30 * 864e5), to: new Date() }) },
  { id: '90d',    label: '90 días',    range: () => ({ from: new Date(Date.now() - 90 * 864e5), to: new Date() }) },
  { id: 'mes',    label: 'Este mes',   range: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth(), 1), to: n } } },
  { id: 'mesant', label: 'Mes pasado', range: () => { const n = new Date(); return { from: new Date(n.getFullYear(), n.getMonth() - 1, 1), to: new Date(n.getFullYear(), n.getMonth(), 1) } } },
  { id: 'anio',   label: 'Este año',   range: () => { const n = new Date(); return { from: new Date(n.getFullYear(), 0, 1), to: n } } },
  { id: 'todo',   label: 'Todo',       range: () => ({ from: null, to: new Date() }) },
]

export interface Delta {
  pct: number | null      // variación % vs período anterior
  dir: 'up' | 'down' | 'flat'
  positivo: boolean       // true si el cambio es "bueno" según la métrica
}

// prev/actual; better='higher' → subir es bueno; 'lower' → bajar es bueno
export function calcDelta(actual: number, prev: number | null | undefined, better: 'higher' | 'lower' = 'higher'): Delta | null {
  if (prev === null || prev === undefined) return null
  if (prev === 0 && actual === 0) return { pct: 0, dir: 'flat', positivo: true }
  const diff = actual - prev
  const pct = prev === 0 ? 100 : Math.round((diff / Math.abs(prev)) * 100)
  const dir: Delta['dir'] = diff > 0 ? 'up' : diff < 0 ? 'down' : 'flat'
  const positivo = dir === 'flat' ? true : better === 'higher' ? diff > 0 : diff < 0
  return { pct, dir, positivo }
}

export function fmtNum(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—'
  return n.toLocaleString('es-AR')
}

export function fmtHoras(n: number | undefined | null): string {
  if (n === undefined || n === null) return '—'
  return `${Number(n).toFixed(1)} hs`
}

// Etiqueta legible de un bucket de tendencia (YYYY-MM-DD) según granularidad
export function fmtBucket(iso: string, bucket: string): string {
  const d = new Date(iso + 'T00:00:00')
  if (bucket === 'month') return d.toLocaleDateString('es-AR', { month: 'short', year: '2-digit' })
  if (bucket === 'week') return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })
}

// ── Export CSV ──────────────────────────────────────────────────────────────
export function toCSV(rows: (string | number)[][]): string {
  return rows
    .map(r => r.map(c => {
      const s = String(c ?? '')
      return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
    }).join(';'))
    .join('\n')
}

export function downloadCSV(filename: string, rows: (string | number)[][]) {
  const csv = '﻿' + toCSV(rows)   // BOM para que Excel abra UTF-8
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
