'use client'

import { Fragment, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { downloadCSV } from '@/lib/estadisticas'

export type DetalleDim = 'area_negocio' | 'area_afectada' | 'motivo' | 'tipo_ticket' | 'proveedor'

export interface DetalleQuery {
  dim: DetalleDim
  label: string        // valor de la barra clickeada
  titulo: string       // nombre de la sección, ej. 'Por motivo'
  color: string
  area: string | null      // filtros globales activos en la página
  proveedor: string | null
  from: string | null
  to: string
}

type Rank = { label: string; total: number; resueltos: number }

const RANK_TABS: { key: keyof Resp['rankings']; label: string }[] = [
  { key: 'solicitante', label: 'Solicitante' },
  { key: 'responsable', label: 'Responsable' },
  { key: 'area_negocio', label: 'Área de negocio' },
  { key: 'proveedor', label: 'Proveedor' },
]

interface Resp {
  dim: DetalleDim
  label: string
  sobreResueltos: boolean
  total: number
  rankings: Record<'solicitante' | 'responsable' | 'area_negocio' | 'proveedor', Rank[]>
  tickets: any[]
}

// Las barras del RPC pueden traer label vacío (motivo/tipo sin cargar) — no lo mostramos crudo
const muestra = (s: string) => (s || '').trim() === '' || s === '—' ? '(sin especificar)' : s

const fecha = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—'

export default function DetalleDimensionModal({ query, onClose }: { query: DetalleQuery; onClose: () => void }) {
  const [data, setData] = useState<Resp | null>(null)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<keyof Resp['rankings']>('solicitante')
  const [abierto, setAbierto] = useState<string | null>(null)

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', esc)
    return () => window.removeEventListener('keydown', esc)
  }, [onClose])

  useEffect(() => {
    const params = new URLSearchParams({ dim: query.dim, label: query.label, to: query.to })
    if (query.area) params.set('area', query.area)
    if (query.proveedor) params.set('proveedor', query.proveedor)
    if (query.from) params.set('from', query.from)
    fetch('/api/stats/detalle?' + params.toString())
      .then(async res => {
        if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || 'error')
        setData(await res.json())
      })
      .catch(() => setError('No se pudo cargar el detalle.'))
  }, [query])

  // La dimensión que estás mirando no aporta nada como ranking (sería una sola fila)
  const tabs = RANK_TABS.filter(t => t.key !== query.dim)
  const activeTab = tabs.some(t => t.key === tab) ? tab : tabs[0].key
  const ranking = data?.rankings[activeTab] || []
  const maxRank = Math.max(...ranking.map(r => r.total), 1)

  const exportCSV = () => {
    if (!data) return
    const rows: (string | number)[][] = [
      [query.titulo, query.label],
      ['Tickets', data.total],
      [],
      [tabs.find(t => t.key === activeTab)!.label.toUpperCase(), 'Tickets', 'Resueltos', '%'],
      ...ranking.map(r => [r.label, r.total, r.resueltos, data.total ? Math.round(r.total / data.total * 100) + '%' : '0%']),
      [],
      ['TICKET', 'Fecha', 'Solicitante', 'Responsable', 'Estado', 'Proveedor', 'Descripción'],
      ...data.tickets.map(t => [
        t.numero, fecha(data.sobreResueltos ? t.fecha_resolucion : t.created_at),
        t.mail_solicitante || '', t.responsable_nombre || 'Sin asignar', t.estado,
        t.proveedor || '', (t.descripcion || '').replace(/\s+/g, ' '),
      ]),
    ]
    const slug = `${query.dim}_${query.label}`.replace(/[^\w]+/g, '_').toLowerCase()
    downloadCSV(`detalle_${slug}.csv`, rows)
  }

  return createPortal(
    <div onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(17,24,39,0.45)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 20px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()}
        style={{ background: 'white', borderRadius: 14, width: '100%', maxWidth: 900, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, padding: '18px 22px', borderBottom: '1px solid #f0f0f0' }}>
          <div>
            <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{query.titulo}</p>
            <h2 style={{ margin: '3px 0 0', fontSize: 19, fontWeight: 700, color: query.color }}>{muestra(query.label)}</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#9ca3af' }}>
              {data ? `${data.total} ticket${data.total === 1 ? '' : 's'}` : 'Cargando…'}
              {data?.sobreResueltos && ' · resueltos en el período'}
              {query.area && ` · área ${query.area}`}
              {query.proveedor && ` · proveedor “${query.proveedor}”`}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button onClick={exportCSV} disabled={!data} style={btnGhost}>⬇ CSV</button>
            <button onClick={onClose} style={{ ...btnGhost, padding: '6px 12px', fontSize: 16, lineHeight: 1 }}>×</button>
          </div>
        </div>

        <div style={{ padding: '18px 22px 22px' }}>
          {error && <p style={{ color: '#dc2626', fontSize: 13 }}>{error}</p>}
          {!data && !error && <p style={{ color: '#9ca3af', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Cargando detalle…</p>}

          {data && data.total === 0 && (
            <p style={{ color: '#9ca3af', fontSize: 13, padding: '30px 0', textAlign: 'center' }}>Sin tickets para esta categoría.</p>
          )}

          {data && data.total > 0 && (
            <>
              {/* Ranking: quién concentra esta categoría */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quién lo concentra</span>
                <div style={{ display: 'flex', gap: 5 }}>
                  {tabs.map(t => (
                    <button key={t.key} onClick={() => setTab(t.key)}
                      style={{ padding: '4px 11px', fontSize: 12, fontWeight: 600, borderRadius: 20, cursor: 'pointer',
                        border: '1px solid ' + (activeTab === t.key ? query.color : '#e5e7eb'),
                        background: activeTab === t.key ? query.color : 'white',
                        color: activeTab === t.key ? 'white' : '#6b7280' }}>{t.label}</button>
                  ))}
                </div>
              </div>

              <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, padding: '4px 14px', marginBottom: 22, maxHeight: 260, overflowY: 'auto' }}>
                {ranking.map((r, i) => (
                  <div key={r.label} style={{ padding: '8px 0', borderTop: i ? '1px solid #f6f6f7' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 12.5, marginBottom: 5 }}>
                      <span style={{ color: '#374151', fontWeight: i === 0 ? 700 : 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {i === 0 && '🥇 '}{muestra(r.label)}
                      </span>
                      <span style={{ color: '#6b7280', flexShrink: 0 }}>
                        <b style={{ color: '#111827' }}>{r.total}</b> · {Math.round(r.total / data.total * 100)}%
                      </span>
                    </div>
                    <div style={{ height: 5, background: '#f3f4f6', borderRadius: 3, overflow: 'hidden' }}>
                      <div style={{ width: `${Math.round(r.total / maxRank * 100)}%`, height: '100%', background: query.color, borderRadius: 3 }} />
                    </div>
                  </div>
                ))}
              </div>

              {/* Tickets que la componen */}
              <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                Tickets ({data.tickets.length}) <span style={{ fontWeight: 500, textTransform: 'none', color: '#b0b3ba', letterSpacing: 0 }}>— click para ver la descripción</span>
              </p>
              <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                  <thead><tr style={{ background: '#f9fafb' }}>
                    {['Ticket', 'Fecha', 'Solicitante', 'Responsable', 'Estado'].map(h => (
                      <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10.5, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', position: 'sticky', top: 0, background: '#f9fafb' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {data.tickets.map(t => {
                      const contexto = [
                        t.proveedor && `Proveedor: ${t.proveedor}`,
                        t.ciudad && `Ciudad: ${t.ciudad}`,
                        t.tipo_servicio && `Servicio: ${t.tipo_servicio}`,
                      ].filter(Boolean).join(' · ')
                      return (
                        <Fragment key={t.id}>
                          <tr onClick={() => setAbierto(abierto === t.id ? null : t.id)}
                            style={{ borderTop: '1px solid #f0f0f0', cursor: 'pointer', background: abierto === t.id ? '#fafafa' : undefined }}>
                            <td style={{ padding: '9px 12px', fontFamily: 'monospace', fontWeight: 600, color: query.color }}>{t.numero}</td>
                            <td style={{ padding: '9px 12px', color: '#6b7280', whiteSpace: 'nowrap' }}>{fecha(data.sobreResueltos ? t.fecha_resolucion : t.created_at)}</td>
                            <td style={{ padding: '9px 12px', color: '#374151', maxWidth: 190, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.mail_solicitante}</td>
                            <td style={{ padding: '9px 12px', color: '#374151' }}>{t.responsable_nombre || 'Sin asignar'}</td>
                            <td style={{ padding: '9px 12px' }}>
                              <span style={{ fontSize: 11, fontWeight: 600, borderRadius: 20, padding: '2px 9px', background: t.estado === 'Resuelto' ? '#dcfce7' : '#fef3c7', color: t.estado === 'Resuelto' ? '#15803d' : '#b45309' }}>{t.estado}</span>
                            </td>
                          </tr>
                          {abierto === t.id && (
                            <tr style={{ background: '#fafafa' }}>
                              <td colSpan={5} style={{ padding: '2px 14px 12px', fontSize: 12.5, color: '#374151', whiteSpace: 'pre-wrap' }}>
                                {contexto && <p style={{ margin: '0 0 6px', fontSize: 11.5, color: '#9ca3af' }}>{contexto}</p>}
                                {t.descripcion || '(sin descripción)'}
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  )
}

const btnGhost: React.CSSProperties = {
  background: 'white', border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px',
  fontSize: 12.5, fontWeight: 500, cursor: 'pointer', color: '#374151',
}
