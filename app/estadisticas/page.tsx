'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'
import {
  PERIODOS, calcDelta, fmtNum, fmtHoras, downloadCSV, type Sector, type Delta,
} from '@/lib/estadisticas'
import { TendenciaChart, SlaDonut, AgingChart } from '@/components/EstadisticasCharts'

// ── Config ──────────────────────────────────────────────────────────────────
const AREAS = ['GRUPOS', 'FITS', 'ALIWEN', 'B2C', 'OTRO']
const AREA_COLORS: Record<string, string> = {
  GRUPOS: '#d97706', FITS: '#2563eb', ALIWEN: '#059669', B2C: '#7c3aed', OTRO: '#6b7280',
}
const SIS_COLORS: Record<string, string> = {
  'Tourplan': '#2563eb', 'Pythagoras/Bazar': '#d97706', 'Backend B2C': '#059669',
  'Vamoos': '#7c3aed', 'Otro': '#6b7280',
}

// ── Helpers UI ──────────────────────────────────────────────────────────────
function SectionTitle({ children, hint }: { children: React.ReactNode; hint?: string }) {
  return (
    <div style={{ margin: '30px 0 14px' }}>
      <h2 style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</h2>
      {hint && <p style={{ margin: '3px 0 0', fontSize: 11.5, color: '#b0b3ba' }}>{hint}</p>}
    </div>
  )
}

function DeltaBadge({ delta }: { delta: Delta | null }) {
  if (!delta || delta.pct === null) return null
  if (delta.dir === 'flat') return <span style={{ fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>=</span>
  const color = delta.positivo ? '#16a34a' : '#dc2626'
  const arrow = delta.dir === 'up' ? '▲' : '▼'
  return (
    <span style={{ fontSize: 11.5, fontWeight: 700, color, display: 'inline-flex', alignItems: 'center', gap: 2 }}>
      {arrow} {Math.abs(delta.pct)}%
    </span>
  )
}

function KpiCard({ label, value, sub, color, delta }: {
  label: string; value: string | number; sub?: string; color?: string; delta?: Delta | null
}) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '16px 20px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
        {delta !== undefined && <DeltaBadge delta={delta} />}
      </div>
      <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: color || '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

function BarList({ rows, color = '#4f6ef7', unit }: {
  rows: { label: string; total: number }[]; color?: string; unit?: string
}) {
  if (!rows?.length) return <p style={{ color: '#9ca3af', fontSize: 13, padding: '10px 0' }}>Sin datos en este período</p>
  const max = Math.max(...rows.map(r => r.total), 1)
  const total = rows.reduce((s, r) => s + r.total, 0)
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, padding: '6px 16px' }}>
      {rows.map((r, i) => {
        const pct = total > 0 ? Math.round(r.total / total * 100) : 0
        return (
          <div key={i} style={{ padding: '9px 0', borderTop: i ? '1px solid #f6f6f7' : 'none' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 5 }}>
              <span style={{ color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{r.label}</span>
              <span style={{ color: '#6b7280' }}><b style={{ color: '#111827' }}>{r.total}</b>{unit ? ` ${unit}` : ''} · {pct}%</span>
            </div>
            <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${Math.round(r.total / max * 100)}%`, height: '100%', background: color, borderRadius: 3 }} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DiasGrid({ dias, color }: { dias: { label: string; total: number }[]; color: string }) {
  if (!dias?.length) return null
  const max = Math.max(...dias.map(d => d.total), 1)
  const total = dias.reduce((s, d) => s + d.total, 0)
  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: 20, display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      {dias.map(d => {
        const pct = total > 0 ? Math.round(d.total / total * 100) : 0
        const barH = Math.round((d.total / max) * 110)
        const weekend = d.label === 'Sábado' || d.label === 'Domingo'
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{d.total}</span>
            <div style={{ width: '100%', height: 110, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '68%', height: barH || 2, borderRadius: '4px 4px 0 0', background: weekend ? '#e5e7eb' : color, opacity: weekend ? 0.6 : 1 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: weekend ? '#9ca3af' : '#374151' }}>{d.label.slice(0, 3)}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function ResponsableTable({ rows }: { rows: any[] }) {
  if (!rows?.length) return <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos</p>
  const totalMax = Math.max(...rows.map(r => r.total), 1)
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Responsable', 'Tickets', 'Resueltos', 'Prom. resolución'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#4f6ef7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{(r.nombre || '?').charAt(0)}</div>
                  {r.nombre}
                </div>
              </td>
              <td style={{ padding: '11px 14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 70, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round(r.total / totalMax * 100)}%`, height: '100%', background: '#4f6ef7', borderRadius: 3 }} />
                  </div>
                  <span style={{ fontWeight: 600 }}>{r.total}</span>
                </div>
              </td>
              <td style={{ padding: '11px 14px', color: '#16a34a', fontWeight: 600 }}>{r.resueltos}</td>
              <td style={{ padding: '11px 14px', color: '#7c3aed', fontWeight: 600 }}>{r.promHoras > 0 ? fmtHoras(r.promHoras) : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SolicitanteTable({ rows }: { rows: any[] }) {
  if (!rows?.length) return <p style={{ color: '#9ca3af', fontSize: 13 }}>Sin datos</p>
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Mail', 'Tickets', 'Resueltos'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 14px', color: '#374151' }}>{e.mail}</td>
              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.total}</td>
              <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600 }}>{e.resueltos || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AtrasadosTable({ atrasados }: { atrasados: any[] }) {
  if (!atrasados?.length) return null
  return (
    <>
      <SectionTitle hint="Tickets abiertos que superan las 24 hs hábiles desde su ingreso">⏰ Atrasados ({atrasados.length})</SectionTitle>
      <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead><tr style={{ background: '#fee2e2' }}>
            {['Ticket', 'Responsable', 'Estado', 'Hs hábiles'].map(h => (
              <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {atrasados.map((a, i) => (
              <tr key={i} style={{ borderTop: '1px solid #fef2f2' }}>
                <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{a.numero}</td>
                <td style={{ padding: '9px 14px' }}>{a.responsable}</td>
                <td style={{ padding: '9px 14px' }}>{a.estado}</td>
                <td style={{ padding: '9px 14px', fontWeight: 700, color: '#dc2626' }}>{Number(a.horas).toFixed(1)} hs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

// ── Página ──────────────────────────────────────────────────────────────────
export default function EstadisticasPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [sector, setSector] = useState<Sector>('bbdd')
  const [areaTab, setAreaTab] = useState<string>('general')  // 'general' | AREA
  const [periodoId, setPeriodoId] = useState('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [proveedor, setProveedor] = useState('')
  const [provList, setProvList] = useState<{ label: string; key: string; total: number }[]>([])
  const [data, setData] = useState<any>(null)
  const [comparacion, setComparacion] = useState<any>(null)
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      if (p.rol !== 'admin') { router.push('/dashboard'); return }
      setPerfil(p)
      const { data: provs } = await sb.rpc('proveedores_tickets_list')
      if (Array.isArray(provs)) setProvList(provs)
    }
    init()
  }, [])

  const currentRange = useCallback(() => {
    if (periodoId === 'custom') {
      const from = customFrom ? new Date(customFrom + 'T00:00:00') : null
      const to = customTo ? new Date(customTo + 'T23:59:59') : new Date()
      return { from, to }
    }
    return (PERIODOS.find(p => p.id === periodoId) || PERIODOS[2]).range()
  }, [periodoId, customFrom, customTo])

  const load = useCallback(async () => {
    setLoading(true)
    const { from, to } = currentRange()
    const params = new URLSearchParams()
    params.set('sector', sector)
    if (sector === 'bbdd' && areaTab !== 'general') params.set('area', areaTab)
    if (sector === 'bbdd' && proveedor) params.set('proveedor', proveedor)
    if (from) params.set('from', from.toISOString())
    params.set('to', to.toISOString())
    params.set('t', String(Date.now()))
    const res = await fetch('/api/stats?' + params.toString())
    if (res.ok) {
      const json = await res.json()
      setData(json.actual)
      setComparacion(json.comparacion)
      setMeta(json.meta)
      setLastUpdate(new Date())
    }
    setLoading(false)
  }, [sector, areaTab, proveedor, currentRange])

  useEffect(() => { if (perfil) load() }, [perfil, sector, areaTab, proveedor, periodoId, customFrom, customTo, load])

  if (!perfil) return null

  const r = data?.resumen
  const c = comparacion
  const accent = sector === 'it' ? '#4f46e5' : '#4f6ef7'

  // ── Export CSV de la vista actual ─────────────────────────────────────────
  const exportCSV = () => {
    if (!data) return
    const rows: (string | number)[][] = []
    const scope = sector === 'it' ? 'IT' : (areaTab === 'general' ? 'BBDD General' : `BBDD ${areaTab}`)
    rows.push([`Estadísticas ${scope}`])
    if (meta?.proveedor) rows.push([`Proveedor`, meta.proveedor])
    rows.push([`Período`, meta?.from ? new Date(meta.from).toLocaleDateString('es-AR') : 'Todo', '→', new Date(meta?.to).toLocaleDateString('es-AR')])
    rows.push([])
    rows.push(['RESUMEN'])
    rows.push(['Creados', r.creados], ['Resueltos', r.resueltos], ['Abiertos', r.abiertos],
      ['Sin asignar', r.sinAsignar], ['En curso', r.enCurso],
      ['Prom. resolución (hs)', r.promHorasResol], ['Prom. asignación (hs)', r.promHorasAsig],
      ['% dentro de SLA', r.pctSla + '%'], ['% resueltos del período', r.pctResueltosPeriodo + '%'])
    rows.push([])
    rows.push(['TENDENCIA', 'Creados', 'Resueltos'])
    for (const t of (data.tendencia || [])) rows.push([t.periodo, t.creados, t.resueltos])
    rows.push([])
    rows.push(['POR RESPONSABLE', 'Tickets', 'Resueltos', 'Prom. resolución (hs)'])
    for (const x of (data.porResponsable || [])) rows.push([x.nombre, x.total, x.resueltos, x.promHoras])
    rows.push([])
    rows.push(['TOP SOLICITANTES', 'Tickets', 'Resueltos'])
    for (const x of (data.porSolicitante || [])) rows.push([x.mail, x.total, x.resueltos])
    if (sector === 'it') {
      rows.push([]); rows.push(['POR SISTEMA', 'Tickets', 'Resueltos', 'Abiertos'])
      for (const x of (data.porSistema || [])) rows.push([x.sistema, x.total, x.resueltos, x.abiertos])
    } else {
      rows.push([]); rows.push(['POR ÁREA AFECTADA', 'Tickets'])
      for (const x of (data.porAreaAfectada || [])) rows.push([x.label, x.total])
      rows.push([]); rows.push(['POR MOTIVO', 'Tickets'])
      for (const x of (data.porMotivo || [])) rows.push([x.label, x.total])
    }
    downloadCSV(`estadisticas_${scope.replace(/\s+/g, '_').toLowerCase()}_${new Date().toISOString().slice(0, 10)}.csv`, rows)
  }

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: 32, maxWidth: 1060 }} className="stats-root">
        {/* Header */}
        <div style={{ marginBottom: 20, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Estadísticas</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
              {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <div className="no-print" style={{ display: 'flex', gap: 8 }}>
            <button onClick={exportCSV} disabled={!data} style={btnGhost}>⬇ CSV</button>
            <button onClick={() => window.print()} disabled={!data} style={btnGhost}>🖨 PDF</button>
            <button onClick={load} disabled={loading} style={btnGhost}>
              {loading ? 'Cargando…' : '↻ Actualizar'}
            </button>
          </div>
        </div>

        {/* Sector */}
        <div className="no-print" style={{ display: 'flex', gap: 8, marginBottom: 14, padding: 8, background: '#f9fafb', borderRadius: 14, border: '1px solid #f0f0f0', width: 'fit-content' }}>
          <button onClick={() => { setSector('bbdd'); setAreaTab('general') }} style={segBtn(sector === 'bbdd')}>📋 BBDD</button>
          <button onClick={() => { setSector('it'); setAreaTab('general'); setProveedor('') }} style={segBtn(sector === 'it')}>🖥️ IT</button>
        </div>

        {/* Período */}
        <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14, alignItems: 'center' }}>
          {PERIODOS.map(p => (
            <button key={p.id} onClick={() => setPeriodoId(p.id)} style={chip(periodoId === p.id, accent)}>{p.label}</button>
          ))}
          <button onClick={() => setPeriodoId('custom')} style={chip(periodoId === 'custom', accent)}>Personalizado</button>
          {periodoId === 'custom' && (
            <span style={{ display: 'inline-flex', gap: 6, alignItems: 'center', marginLeft: 4 }}>
              <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)} style={dateInput} />
              <span style={{ color: '#9ca3af', fontSize: 12 }}>→</span>
              <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)} style={dateInput} />
            </span>
          )}
        </div>

        {/* Filtro por proveedor (solo BBDD) */}
        {sector === 'bbdd' && (
          <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#6b7280' }}>Proveedor:</span>
            <div style={{ position: 'relative' }}>
              <input
                list="prov-list"
                value={proveedor}
                onChange={e => setProveedor(e.target.value)}
                placeholder="Todos los proveedores…"
                style={{ ...dateInput, width: 260, paddingRight: proveedor ? 26 : 10 }}
              />
              {proveedor && (
                <button onClick={() => setProveedor('')} title="Quitar filtro"
                  style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
              )}
            </div>
            <datalist id="prov-list">
              {provList.map(p => <option key={p.key} value={p.label}>{`${p.total} tickets`}</option>)}
            </datalist>
            {proveedor && (
              <span style={{ fontSize: 12, color: accent, fontWeight: 600, background: '#eef2ff', borderRadius: 20, padding: '4px 12px' }}>
                Filtrando por “{proveedor}”
              </span>
            )}
          </div>
        )}

        {/* Tabs de área (solo BBDD) */}
        {sector === 'bbdd' && (
          <div className="no-print" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 24, padding: '10px 12px', background: '#f9fafb', borderRadius: 12, border: '1px solid #f0f0f0' }}>
            <button onClick={() => setAreaTab('general')} style={tab(areaTab === 'general', '#111827')}>📊 General</button>
            {AREAS.map(a => <button key={a} onClick={() => setAreaTab(a)} style={tab(areaTab === a, AREA_COLORS[a])}>{a}</button>)}
          </div>
        )}

        {loading && <div style={{ padding: '80px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Cargando estadísticas…</div>}

        {!loading && data && r && (
          <>
            {/* KPIs con comparación */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 14 }}>
              <KpiCard label="Creados" value={fmtNum(r.creados)} delta={calcDelta(r.creados, c?.creados, 'higher')} sub="en el período" color={accent} />
              <KpiCard label="Resueltos" value={fmtNum(r.resueltos)} delta={calcDelta(r.resueltos, c?.resueltos, 'higher')} sub={`${r.pctResueltosPeriodo}% de lo creado`} color="#16a34a" />
              <KpiCard label="Abiertos hoy" value={fmtNum(r.abiertos)} sub={`${r.sinAsignar} sin asignar · ${r.enCurso} en curso`} color="#ea580c" />
              <KpiCard label="Prom. resolución" value={fmtHoras(r.promHorasResol)} delta={calcDelta(r.promHorasResol, c?.promHorasResol, 'lower')} sub="horas hábiles" color="#7c3aed" />
              <KpiCard label="Prom. asignación" value={fmtHoras(r.promHorasAsig)} delta={calcDelta(r.promHorasAsig, c?.promHorasAsig, 'lower')} sub="hasta 1ª respuesta" color="#0891b2" />
            </div>

            {/* Tendencia + SLA */}
            <SectionTitle hint="Tickets ingresados vs. resueltos a lo largo del período">Tendencia</SectionTitle>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 200px', gap: 14, alignItems: 'stretch' }} className="tend-grid">
              <TendenciaChart data={data.tendencia} bucket={meta?.bucket || 'week'} />
              <SlaDonut pct={r.pctSla} slaHoras={r.slaHoras} />
            </div>

            {/* Aging del backlog */}
            <SectionTitle hint={`Antigüedad de los ${data.aging?.total || 0} tickets abiertos ahora mismo`}>Backlog por antigüedad</SectionTitle>
            <AgingChart buckets={data.aging?.buckets || []} />

            <AtrasadosTable atrasados={data.atrasados || []} />

            {/* Por responsable */}
            <SectionTitle>Por responsable</SectionTitle>
            <ResponsableTable rows={data.porResponsable || []} />

            {/* Sección específica por sector */}
            {sector === 'it' ? (
              <>
                <SectionTitle>Por sistema</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: 12 }}>
                  {(data.porSistema || []).map((s: any) => (
                    <div key={s.sistema} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 18px' }}>
                      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: SIS_COLORS[s.sistema] || '#6b7280', textTransform: 'uppercase' }}>{s.sistema}</p>
                      <p style={{ margin: '0 0 4px', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{s.total}</p>
                      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                        <span style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>✓ {s.resueltos}</span>
                        <span style={{ fontSize: 12, color: '#ea580c', fontWeight: 600 }}>⏳ {s.abiertos}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <SectionTitle>Por módulo</SectionTitle>
                <BarList rows={data.porModulo || []} color={accent} />
                {(data.porFile || []).length > 0 && <>
                  <SectionTitle>Files con más tickets</SectionTitle>
                  <BarList rows={data.porFile} color="#0891b2" />
                </>}
              </>
            ) : (
              <>
                {areaTab === 'general' && (data.porArea || []).length > 0 && <>
                  <SectionTitle>Por área de negocio</SectionTitle>
                  <BarList rows={data.porArea} color={accent} />
                </>}
                <SectionTitle>Por área afectada</SectionTitle>
                <BarList rows={data.porAreaAfectada || []} color="#2563eb" />
                <SectionTitle>Por motivo</SectionTitle>
                <BarList rows={data.porMotivo || []} color="#7c3aed" />
                {(data.porProveedor || []).length > 0 && <>
                  <SectionTitle>Proveedores más mencionados</SectionTitle>
                  <BarList rows={data.porProveedor} color="#059669" />
                </>}
                {(data.porTipo || []).length > 0 && <>
                  <SectionTitle hint="Sobre tickets resueltos en el período">Tipos de resolución</SectionTitle>
                  <BarList rows={data.porTipo} color="#d97706" />
                </>}
              </>
            )}

            {/* Top solicitantes */}
            <SectionTitle>Top solicitantes</SectionTitle>
            <SolicitanteTable rows={data.porSolicitante || []} />

            {/* Rangos + días */}
            <SectionTitle>Ingreso por rango horario</SectionTitle>
            <BarList rows={data.rangosHorarios || []} color={accent} />
            <SectionTitle>Ingreso por día de la semana</SectionTitle>
            <DiasGrid dias={data.diasSemana || []} color={accent} />
          </>
        )}
      </div>

      <style jsx global>{`
        @media (max-width: 720px) { .tend-grid { grid-template-columns: 1fr !important; } }
        @media print {
          .no-print, aside, nav { display: none !important; }
          main { margin-left: 0 !important; }
          main > div:first-child { display: none !important; } /* barra superior */
          .stats-root { max-width: 100% !important; padding: 0 !important; }
          body { background: white !important; }
        }
        @page { margin: 14mm; }
      `}</style>
    </AppShell>
  )
}

// ── Estilos inline reutilizables ────────────────────────────────────────────
const btnGhost: React.CSSProperties = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 14px',
  fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151',
}
const dateInput: React.CSSProperties = {
  border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 10px', fontSize: 12.5, color: '#374151',
}
function segBtn(active: boolean): React.CSSProperties {
  return {
    padding: '9px 22px', fontSize: 14, fontWeight: 700, border: 'none', borderRadius: 10, cursor: 'pointer',
    background: active ? '#111827' : 'white', color: active ? 'white' : '#6b7280',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
  }
}
function chip(active: boolean, accent: string): React.CSSProperties {
  return {
    padding: '6px 14px', fontSize: 12.5, fontWeight: 600, border: '1px solid ' + (active ? accent : '#e5e7eb'),
    borderRadius: 20, cursor: 'pointer', background: active ? accent : 'white', color: active ? 'white' : '#6b7280',
  }
}
function tab(active: boolean, color: string): React.CSSProperties {
  return {
    padding: '7px 16px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer',
    background: active ? color : 'white', color: active ? 'white' : '#6b7280',
    boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
  }
}
