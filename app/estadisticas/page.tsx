'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'

const AREAS = ['GRUPOS', 'FITS', 'ALIWEN', 'B2C', 'OTRO']
const AREA_COLORS: Record<string, { bg: string; color: string; header: string }> = {
  GRUPOS:  { bg: '#fef3c7', color: '#92400e', header: '#d97706' },
  FITS:    { bg: '#dbeafe', color: '#1e40af', header: '#2563eb' },
  ALIWEN:  { bg: '#d1fae5', color: '#065f46', header: '#059669' },
  B2C:     { bg: '#ede9fe', color: '#5b21b6', header: '#7c3aed' },
  OTRO:    { bg: '#f3f4f6', color: '#374151', header: '#6b7280' },
}

interface GlobalStats {
  resumen: { totalActual: number; recibidosAhora: number; asignadosAhora: number; resueltosAhora: number; promHoras: number }
  porResponsable: { nombre: string; total: number; resueltos: number; sumaHoras: number; cantHoras: number }[]
  porEmisor: { mail: string; total: number; resueltos: number; prom: number }[]
  rangos: { label: string; total: number }[]
  dias: { label: string; total: number }[]
  atrasados: { numero: string; responsable: string; estado: string; horas: number }[]
  porTipoTicket: { tipo: string; total: number }[]
}

interface AreaStats {
  total: number
  porEstado: Record<string, number>
  porSolicitante: { mail: string; total: number; resueltos: number; abiertos: number; rangos: number[]; promHoras: number }[]
  rangos: { label: string; total: number }[]
  dias: { label: string; total: number }[]
  porTipo: { tipo: string; total: number }[]
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: '28px 0 14px', fontSize: 13, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</h2>
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 22px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: color || '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

const RANGOS_LABELS = ['06:00–08:59', '09:00–15:59', '16:00–17:59', '18:00–05:59']

export default function EstadisticasPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [activeTab, setActiveTab] = useState<'general' | string>('general')
  const [globalStats, setGlobalStats] = useState<GlobalStats | null>(null)
  const [areaStats, setAreaStats] = useState<AreaStats | null>(null)
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
      setPerfil(p)
      await loadGlobal()
    }
    init()
  }, [])

  const loadGlobal = async () => {
    setLoading(true)
    const res = await fetch('/api/stats?t=' + Date.now())
    if (res.ok) { setGlobalStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }

  const loadArea = async (area: string) => {
    setLoading(true)
    setAreaStats(null)
    const res = await fetch(`/api/stats-area?area=${area}&t=` + Date.now())
    if (res.ok) { setAreaStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }

  const handleTab = (tab: string) => {
    setActiveTab(tab)
    if (tab === 'general') loadGlobal()
    else loadArea(tab)
  }

  if (!perfil) return null

  const tabStyle = (tab: string): React.CSSProperties => {
    const active = activeTab === tab
    const aColor = tab !== 'general' ? AREA_COLORS[tab] : null
    return {
      padding: '8px 18px', fontSize: 13, fontWeight: 600, border: 'none',
      borderRadius: 8, cursor: 'pointer', transition: 'all 0.15s',
      background: active ? (aColor ? aColor.header : '#111827') : 'white',
      color: active ? 'white' : '#6b7280',
      boxShadow: active ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
    }
  }

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: '32px', maxWidth: 1000 }}>
        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Estadísticas</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
              {lastUpdate && `Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <button onClick={() => handleTab(activeTab)} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151', opacity: loading ? 0.6 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 28, padding: '12px', background: '#f9fafb', borderRadius: 12, border: '1px solid #f0f0f0' }}>
          <button onClick={() => handleTab('general')} style={tabStyle('general')}>📊 General</button>
          {AREAS.map(a => (
            <button key={a} onClick={() => handleTab(a)} style={tabStyle(a)}>
              {a}
            </button>
          ))}
        </div>

        {loading && !globalStats && !areaStats && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Cargando estadísticas…</div>
        )}

        {/* ── TAB GENERAL ── */}
        {activeTab === 'general' && globalStats && (
          <GlobalView stats={globalStats} />
        )}

        {/* ── TAB ÁREA ── */}
        {activeTab !== 'general' && areaStats && (
          <AreaView area={activeTab} stats={areaStats} />
        )}
      </div>
    </AppShell>
  )
}

// ── Vista General ──────────────────────────────────────────────────────────
function GlobalView({ stats }: { stats: GlobalStats }) {
  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 }}>
        <StatCard label="Total tickets" value={stats.resumen.totalActual.toLocaleString()} />
        <StatCard label="Sin asignar" value={stats.resumen.recibidosAhora} color="#ea580c" />
        <StatCard label="En curso" value={stats.resumen.asignadosAhora} color="#2563eb" />
        <StatCard label="Resueltos" value={stats.resumen.resueltosAhora.toLocaleString()} color="#16a34a" />
        <StatCard label="Prom. resolución" value={`${stats.resumen.promHoras.toFixed(1)} hs`} sub="horas hábiles" color="#7c3aed" />
      </div>

      {stats.atrasados.length > 0 && (
        <>
          <SectionTitle>⏰ Con +24 hs hábiles sin resolver ({stats.atrasados.length})</SectionTitle>
          <div style={{ background: '#fff', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ background: '#fee2e2' }}>
                {['Ticket','Responsable','Estado','Hs hábiles'].map(h => (
                  <th key={h} style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stats.atrasados.map((a, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #fef2f2' }}>
                    <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{a.numero}</td>
                    <td style={{ padding: '9px 14px' }}>{a.responsable}</td>
                    <td style={{ padding: '9px 14px' }}>{a.estado}</td>
                    <td style={{ padding: '9px 14px', fontWeight: 700, color: '#dc2626' }}>{a.horas.toFixed(1)} hs</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <SectionTitle>Por responsable</SectionTitle>
      <ResponsableTable rows={stats.porResponsable} totalHabil={stats.resumen.totalActual} />

      <SectionTitle>Top 10 solicitantes</SectionTitle>
      <EmisorTable rows={stats.porEmisor} />

      <SectionTitle>Tickets por rango horario</SectionTitle>
      <RangosGrid rangos={stats.rangos} />

      <SectionTitle>Tickets por día de la semana</SectionTitle>
      <DiasGrid dias={stats.dias} />

      <SectionTitle>Tipos de resolución</SectionTitle>
      <TiposTable rows={stats.porTipoTicket} />
    </>
  )
}

// ── Vista Área ─────────────────────────────────────────────────────────────
function AreaView({ area, stats }: { area: string; stats: AreaStats }) {
  const cfg = AREA_COLORS[area] || AREA_COLORS['OTRO']
  const abiertos = (stats.porEstado['Recibido'] || 0) + (stats.porEstado['Asignado'] || 0) +
    (stats.porEstado['Pendiente Operador'] || 0) + (stats.porEstado['Pendiente Ventas'] || 0)
  const resueltos = stats.porEstado['Resuelto'] || 0

  return (
    <>
      {/* KPIs del área */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14, marginBottom: 4 }}>
        <StatCard label="Total tickets" value={stats.total.toLocaleString()} color={cfg.header} />
        <StatCard label="Resueltos" value={resueltos.toLocaleString()} color="#16a34a" />
        <StatCard label="Abiertos" value={abiertos} color="#ea580c" />
        <StatCard label="Solicitantes" value={stats.porSolicitante.length} color={cfg.header} />
      </div>

      {/* Estados */}
      <SectionTitle>Por estado</SectionTitle>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 4 }}>
        {Object.entries(stats.porEstado).sort((a,b) => b[1]-a[1]).map(([estado, n]) => (
          <div key={estado} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 18px', textAlign: 'center', minWidth: 120 }}>
            <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: '#111827' }}>{n}</p>
            <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{estado}</p>
          </div>
        ))}
      </div>

      {/* Rangos horarios del área */}
      <SectionTitle>Tickets por rango horario — {area}</SectionTitle>
      <RangosGrid rangos={stats.rangos} color={cfg.header} />

      {/* Por solicitante */}
      <SectionTitle>Por solicitante ({stats.porSolicitante.length})</SectionTitle>
      <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
              <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Mail</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Total</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Resueltos</th>
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Abiertos</th>
              {RANGOS_LABELS.map(r => (
                <th key={r} style={{ padding: '10px 10px', textAlign: 'center', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{r}</th>
              ))}
              <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Prom. hs</th>
            </tr>
          </thead>
          <tbody>
            {stats.porSolicitante.map((s, i) => (
              <tr key={s.mail} style={{ borderTop: '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                <td style={{ padding: '9px 14px', color: '#374151', fontSize: 12 }}>{s.mail}</td>
                <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 700 }}>{s.total}</td>
                <td style={{ padding: '9px 14px', textAlign: 'center', color: '#16a34a', fontWeight: 600 }}>{s.resueltos}</td>
                <td style={{ padding: '9px 14px', textAlign: 'center', color: s.abiertos > 0 ? '#ea580c' : '#9ca3af', fontWeight: 600 }}>{s.abiertos || '—'}</td>
                {s.rangos.map((n, ri) => (
                  <td key={ri} style={{ padding: '9px 10px', textAlign: 'center', color: n > 0 ? cfg.header : '#d1d5db', fontWeight: n > 0 ? 600 : 400, fontSize: 12 }}>{n || '—'}</td>
                ))}
                <td style={{ padding: '9px 14px', textAlign: 'center', color: '#7c3aed', fontWeight: 600 }}>
                  {s.promHoras > 0 ? `${s.promHoras.toFixed(1)} hs` : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Días de la semana del área */}
      <SectionTitle>Tickets por día de la semana — {area}</SectionTitle>
      <DiasGrid dias={stats.dias} color={cfg.header} />

      {/* Tipos de resolución del área */}
      {stats.porTipo.length > 0 && (
        <>
          <SectionTitle>Tipos de resolución — {area}</SectionTitle>
          <TiposTable rows={stats.porTipo} color={cfg.header} />
        </>
      )}
    </>
  )
}

// ── Componentes compartidos ─────────────────────────────────────────────────
function ResponsableTable({ rows, totalHabil }: { rows: any[]; totalHabil: number }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Responsable','Total','Resueltos','Prom. resolución'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const prom = r.cantHoras > 0 ? (r.sumaHoras / r.cantHoras).toFixed(1) : '—'
            const pct = totalHabil > 0 ? Math.round(r.total / totalHabil * 100) : 0
            return (
              <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '11px 14px', fontWeight: 600 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 26, height: 26, borderRadius: '50%', background: '#4f6ef7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>{r.nombre.charAt(0)}</div>
                    {r.nombre}
                  </div>
                </td>
                <td style={{ padding: '11px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 70, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: '#4f6ef7', borderRadius: 3 }} />
                    </div>
                    <span style={{ fontWeight: 600 }}>{r.total}</span>
                  </div>
                </td>
                <td style={{ padding: '11px 14px', color: '#16a34a', fontWeight: 600 }}>{r.resueltos}</td>
                <td style={{ padding: '11px 14px', color: '#7c3aed', fontWeight: 600 }}>{prom !== '—' ? `${prom} hs` : '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function EmisorTable({ rows }: { rows: any[] }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Mail','Tickets','Resueltos','Prom. resolución'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((e, i) => (
            <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
              <td style={{ padding: '10px 14px', color: '#374151' }}>{e.mail}</td>
              <td style={{ padding: '10px 14px', fontWeight: 600 }}>{e.total}</td>
              <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 600 }}>{e.resueltos}</td>
              <td style={{ padding: '10px 14px', color: '#7c3aed', fontWeight: 600 }}>{e.prom > 0 ? `${e.prom.toFixed(1)} hs` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function RangosGrid({ rangos, color = '#4f6ef7' }: { rangos: { label: string; total: number }[]; color?: string }) {
  const total = rangos.reduce((s, r) => s + r.total, 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }}>
      {rangos.map((r, i) => {
        const pct = total > 0 ? Math.round(r.total / total * 100) : 0
        return (
          <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 18px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{r.label}</p>
            <p style={{ margin: '0 0 8px', fontSize: 26, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{r.total}</p>
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <p style={{ margin: '5px 0 0', fontSize: 11, color: '#9ca3af' }}>{pct}% del total</p>
          </div>
        )
      })}
    </div>
  )
}

function DiasGrid({ dias, color = '#4f6ef7' }: { dias: { label: string; total: number }[]; color?: string }) {
  const max = Math.max(...dias.map(d => d.total), 1)
  const total = dias.reduce((s, d) => s + d.total, 0)
  const DIA_COLORS: Record<string, string> = {
    'Lunes': '#4f6ef7', 'Martes': '#7c3aed', 'Miércoles': '#0891b2',
    'Jueves': '#059669', 'Viernes': '#d97706', 'Sábado': '#dc2626', 'Domingo': '#db2777'
  }
  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '20px', display: 'flex', gap: 12, alignItems: 'flex-end' }}>
      {dias.map((d, i) => {
        const pct = Math.round(d.total / total * 100) || 0
        const barH = Math.round((d.total / max) * 120)
        const isWeekend = d.label === 'Sábado' || d.label === 'Domingo'
        const barColor = color !== '#4f6ef7' ? color : (DIA_COLORS[d.label] || '#4f6ef7')
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{d.total}</span>
            <div style={{ width: '100%', height: 120, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{
                width: '70%', height: barH || 2, borderRadius: '4px 4px 0 0',
                background: isWeekend ? '#e5e7eb' : barColor,
                opacity: isWeekend ? 0.6 : 1,
                transition: 'height 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: isWeekend ? '#9ca3af' : '#374151', textAlign: 'center' }}>
              {d.label.slice(0, 3)}
            </span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function TiposTable({ rows, color = '#4f6ef7' }: { rows: { tipo: string; total: number }[]; color?: string }) {
  const total = rows.reduce((s, r) => s + r.total, 0)
  if (rows.length === 0) return <p style={{ color: '#9ca3af', fontSize: 13, padding: '16px 0' }}>Sin datos aún</p>
  return (
    <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead><tr style={{ background: '#f9fafb' }}>
          {['Tipo','Tickets','Porcentaje'].map(h => (
            <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
          ))}
        </tr></thead>
        <tbody>
          {rows.map((r, i) => {
            const pct = total > 0 ? Math.round(r.total / total * 100) : 0
            return (
              <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                <td style={{ padding: '10px 14px', fontWeight: 500 }}>{r.tipo}</td>
                <td style={{ padding: '10px 14px', fontWeight: 700 }}>{r.total}</td>
                <td style={{ padding: '10px 14px', minWidth: 160 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ flex: 1, height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 3 }} />
                    </div>
                    <span style={{ fontSize: 12, color: '#6b7280', minWidth: 32 }}>{pct}%</span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
