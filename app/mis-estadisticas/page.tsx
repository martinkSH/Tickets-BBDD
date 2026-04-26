'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'

// ── Helpers visuales ───────────────────────────────────────────────────────
function KPI({ label, value, color, sub }: { label: string; value: string | number; color?: string; sub?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '18px 22px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 30, fontWeight: 700, color: color || '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h3 style={{ margin: '24px 0 12px', fontSize: 12, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</h3>
}

function RangosGrid({ rangos, color }: { rangos: { label: string; total: number }[]; color: string }) {
  const total = rangos.reduce((s, r) => s + r.total, 0)
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 10 }}>
      {rangos.map((r, i) => {
        const pct = total > 0 ? Math.round(r.total / total * 100) : 0
        return (
          <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 4px', fontSize: 11, color: '#9ca3af', fontWeight: 600 }}>{r.label}</p>
            <p style={{ margin: '0 0 6px', fontSize: 24, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{r.total}</p>
            <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2 }} />
            </div>
            <p style={{ margin: '4px 0 0', fontSize: 11, color: '#9ca3af' }}>{pct}%</p>
          </div>
        )
      })}
    </div>
  )
}

function DiasGrid({ dias, color }: { dias: { label: string; total: number }[]; color: string }) {
  const max = Math.max(...dias.map(d => d.total), 1)
  const total = dias.reduce((s, d) => s + d.total, 0)
  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 20px', display: 'flex', gap: 10, alignItems: 'flex-end' }}>
      {dias.map((d, i) => {
        const pct = total > 0 ? Math.round(d.total / total * 100) : 0
        const barH = Math.round((d.total / max) * 100)
        const isWeekend = d.label === 'Sábado' || d.label === 'Domingo'
        return (
          <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#374151' }}>{d.total}</span>
            <div style={{ width: '100%', height: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
              <div style={{ width: '70%', height: `${barH || 1}%`, borderRadius: '4px 4px 0 0', background: isWeekend ? '#e5e7eb' : color, opacity: isWeekend ? 0.6 : 1 }} />
            </div>
            <span style={{ fontSize: 11, fontWeight: 600, color: isWeekend ? '#9ca3af' : '#374151' }}>{d.label.slice(0, 3)}</span>
            <span style={{ fontSize: 10, color: '#9ca3af' }}>{pct}%</span>
          </div>
        )
      })}
    </div>
  )
}

function EstadosGrid({ porEstado }: { porEstado: Record<string, number> }) {
  const COLORES: Record<string, string> = {
    Recibido: '#6b7280', Asignado: '#2563eb', Pendiente: '#7c3aed',
    'Pendiente Operador': '#d97706', 'Pendiente Ventas': '#d97706', Resuelto: '#16a34a',
  }
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
      {Object.entries(porEstado).sort((a, b) => b[1] - a[1]).map(([estado, n]) => (
        <div key={estado} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 10, padding: '12px 18px', textAlign: 'center', minWidth: 100 }}>
          <p style={{ margin: '0 0 4px', fontSize: 22, fontWeight: 700, color: COLORES[estado] || '#374151' }}>{n}</p>
          <p style={{ margin: 0, fontSize: 12, color: '#6b7280' }}>{estado}</p>
        </div>
      ))}
    </div>
  )
}

function AtrasadosTable({ atrasados }: { atrasados: { numero: string; estado: string; horas: number }[] }) {
  if (!atrasados.length) return null
  return (
    <>
      <SectionTitle>⏰ Con +24 hs hábiles sin resolver ({atrasados.length})</SectionTitle>
      <div style={{ background: 'white', border: '1px solid #fecaca', borderRadius: 12, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#fee2e2' }}>
              {['Ticket', 'Estado', 'Hs hábiles'].map(h => (
                <th key={h} style={{ padding: '8px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {atrasados.map((a, i) => (
              <tr key={i} style={{ borderTop: '1px solid #fef2f2' }}>
                <td style={{ padding: '9px 14px', fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{a.numero}</td>
                <td style={{ padding: '9px 14px' }}>{a.estado}</td>
                <td style={{ padding: '9px 14px', fontWeight: 700, color: '#dc2626' }}>{a.horas.toFixed(1)} hs</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function SectorStats({ titulo, stats, color, emoji }: { titulo: string; stats: any; color: string; emoji: string }) {
  return (
    <div style={{ background: '#f9fafb', borderRadius: 14, border: '1px solid #f0f0f0', padding: 20, marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span>{emoji}</span> {titulo}
        <span style={{ fontSize: 12, fontWeight: 400, color: '#9ca3af', marginLeft: 4 }}>({stats.total} tickets en total)</span>
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(140px,1fr))', gap: 12, marginBottom: 4 }}>
        <KPI label="Total" value={stats.total} color={color} />
        <KPI label="Resueltos" value={stats.resueltos} color="#16a34a" />
        <KPI label="Abiertos" value={stats.abiertos} color={stats.abiertos > 0 ? '#ea580c' : '#16a34a'} />
        <KPI label="Prom. resolución" value={`${stats.promHoras.toFixed(1)} hs`} sub="hábiles" color="#7c3aed" />
      </div>

      <AtrasadosTable atrasados={stats.atrasados} />

      <SectionTitle>Por estado</SectionTitle>
      <EstadosGrid porEstado={stats.porEstado} />

      <SectionTitle>Por rango horario</SectionTitle>
      <RangosGrid rangos={stats.rangos} color={color} />

      <SectionTitle>Por día de la semana</SectionTitle>
      <DiasGrid dias={stats.dias} color={color} />
    </div>
  )
}

// ── Página principal ───────────────────────────────────────────────────────
export default function MisEstadisticasPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [stats, setStats] = useState<any>(null)
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
      // Admins ven /estadisticas global — acá solo responsables
      if (p.rol === 'admin') { router.push('/estadisticas'); return }
      setPerfil(p)
      await cargar()
    }
    init()
  }, [])

  const cargar = async () => {
    setLoading(true)
    const res = await fetch('/api/mis-stats?t=' + Date.now())
    if (res.ok) { setStats(await res.json()); setLastUpdate(new Date()) }
    setLoading(false)
  }

  if (!perfil) return null

  const rolLabel: Record<string, string> = {
    'responsable BBDD': 'Responsable BBDD',
    'responsable IT': 'Responsable IT',
    'responsable IT/BBDD': 'Responsable IT & BBDD',
    'responsable': 'Responsable',
  }

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: 32, maxWidth: 900 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Mis estadísticas</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
              {rolLabel[perfil.rol] || perfil.rol}
              {lastUpdate && ` · Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <button onClick={cargar} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, cursor: 'pointer', color: '#374151', opacity: loading ? 0.6 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            {loading ? 'Cargando…' : 'Actualizar'}
          </button>
        </div>

        {loading && (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
            Cargando tus estadísticas…
          </div>
        )}

        {!loading && stats && (
          <>
            {!stats.bbdd && !stats.it && (
              <div style={{ textAlign: 'center', padding: '80px 0' }}>
                <p style={{ fontSize: 48, marginBottom: 16 }}>📊</p>
                <p style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: '0 0 8px' }}>Sin tickets asignados aún</p>
                <p style={{ fontSize: 14, color: '#9ca3af' }}>Cuando te asignen tickets vas a ver tus métricas acá.</p>
              </div>
            )}

            {stats.bbdd && (
              <SectorStats
                titulo="Tickets BBDD"
                stats={stats.bbdd}
                color="#2563eb"
                emoji="📋"
              />
            )}

            {stats.it && (
              <SectorStats
                titulo="Tickets IT"
                stats={stats.it}
                color="#7c3aed"
                emoji="🖥️"
              />
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
