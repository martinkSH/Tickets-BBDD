'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'

interface Stats {
  resumen: { totalActual: number; recibidosAhora: number; asignadosAhora: number; resueltosAhora: number; totalHabil: number; promHoras: number }
  porResponsable: { nombre: string; total: number; resueltos: number; sumaHoras: number; cantHoras: number }[]
  porEmisor: { mail: string; total: number; resueltos: number; prom: number }[]
  rangos: { label: string; total: number }[]
  atrasados: { numero: string; responsable: string; estado: string; horas: number }[]
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'white', borderRadius: 12, padding: '20px 24px', border: '1px solid #f0f0f0', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 32, fontWeight: 700, color: color || '#111827', lineHeight: 1 }}>{value}</p>
      {sub && <p style={{ margin: '6px 0 0', fontSize: 12, color: '#9ca3af' }}>{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 style={{ margin: '32px 0 16px', fontSize: 14, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{children}</h2>
}

export default function EstadisticasPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const router = useRouter()

  const loadStats = async () => {
    setLoading(true)
    const res = await fetch('/api/stats?t=' + Date.now())
    if (res.ok) {
      setStats(await res.json())
      setLastUpdate(new Date())
    }
    setLoading(false)
  }

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setPerfil(p)
      await loadStats()
    }
    init()
  }, [])

  if (!perfil) return null

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: '32px', maxWidth: 960 }}>
        <div style={{ marginBottom: 24, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Estadísticas</h1>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>
              Métricas en horario hábil (Lun–Vie 9–18) · tiempos en horas hábiles
              {lastUpdate && ` · Actualizado ${lastUpdate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}`}
            </p>
          </div>
          <button onClick={loadStats} disabled={loading}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 500, cursor: 'pointer', color: '#374151', opacity: loading ? 0.6 : 1 }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: loading ? 'rotate(360deg)' : 'none', transition: 'transform 0.5s' }}>
              <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
            </svg>
            {loading ? 'Actualizando…' : 'Actualizar'}
          </button>
        </div>

        {loading && !stats ? (
          <div style={{ padding: '80px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Cargando estadísticas…</div>
        ) : stats ? <>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 16 }}>
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
                  <thead>
                    <tr style={{ background: '#fee2e2' }}>
                      {['Ticket','Responsable','Estado','Hs hábiles abiertas'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#dc2626', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {stats.atrasados.map((a, i) => (
                      <tr key={i} style={{ borderTop: '1px solid #fef2f2' }}>
                        <td style={{ padding: '10px 16px', fontFamily: 'monospace', fontWeight: 600, color: '#dc2626' }}>{a.numero}</td>
                        <td style={{ padding: '10px 16px' }}>{a.responsable}</td>
                        <td style={{ padding: '10px 16px' }}>{a.estado}</td>
                        <td style={{ padding: '10px 16px', fontWeight: 700, color: '#dc2626' }}>{a.horas.toFixed(1)} hs</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}

          <SectionTitle>Por responsable</SectionTitle>
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Responsable','Total','Resueltos','Prom. resolución (hs)'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.porResponsable.map((r, i) => {
                  const prom = r.cantHoras > 0 ? (r.sumaHoras / r.cantHoras).toFixed(1) : '—'
                  const pct = stats.resumen.totalHabil > 0 ? Math.round(r.total / stats.resumen.totalHabil * 100) : 0
                  return (
                    <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px 16px', fontWeight: 600 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#4f6ef7', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700 }}>
                            {r.nombre.charAt(0)}
                          </div>
                          {r.nombre}
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 80, height: 6, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: '#4f6ef7', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontWeight: 600 }}>{r.total}</span>
                        </div>
                      </td>
                      <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>{r.resueltos}</td>
                      <td style={{ padding: '12px 16px', color: '#7c3aed', fontWeight: 600 }}>{prom}{prom !== '—' ? ' hs' : ''}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <SectionTitle>Top 10 solicitantes</SectionTitle>
          <div style={{ background: '#fff', border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Mail','Tickets','Resueltos','Prom. resolución (hs)'].map(h => (
                    <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.porEmisor.map((e, i) => (
                  <tr key={i} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 16px', color: '#374151' }}>{e.mail}</td>
                    <td style={{ padding: '10px 16px', fontWeight: 600 }}>{e.total}</td>
                    <td style={{ padding: '10px 16px', color: '#16a34a', fontWeight: 600 }}>{e.resueltos}</td>
                    <td style={{ padding: '10px 16px', color: '#7c3aed', fontWeight: 600 }}>{e.prom > 0 ? `${e.prom.toFixed(1)} hs` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <SectionTitle>Tickets por rango horario</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
            {stats.rangos.map((r, i) => {
              const total = stats.rangos.reduce((s, x) => s + x.total, 0)
              const pct = total > 0 ? Math.round(r.total / total * 100) : 0
              return (
                <div key={i} style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '16px 20px' }}>
                  <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af', fontWeight: 600 }}>{r.label}</p>
                  <p style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 700, color: '#111827', lineHeight: 1 }}>{r.total}</p>
                  <div style={{ height: 4, background: '#f3f4f6', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', background: '#4f6ef7', borderRadius: 2 }} />
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: '#9ca3af' }}>{pct}% del total</p>
                </div>
              )
            })}
          </div>

        </> : <p style={{ color: '#9ca3af' }}>No se pudieron cargar las estadísticas.</p>}
      </div>
    </AppShell>
  )
}
