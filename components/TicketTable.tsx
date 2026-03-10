'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import type { Ticket, Perfil } from '@/lib/types'
import { ESTADO_CONFIG, AREA_CONFIG, ESTADOS_ORDEN, formatFecha, cx } from '@/lib/types'
import TicketModal from './TicketModal'

interface Props {
  tickets: Ticket[]
  responsables: { id: string; nombre: string; mail: string }[]
  perfil: Perfil
  title: string
  soloMios: boolean
  page: number
  pageSize: number
  totalCount: number
}

const AREAS_FILTRO = ['Todas', 'Tarifas', 'Base de Datos', 'Otro'] as const

const AVATAR_COLORS = [
  '#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d'
]
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

export default function TicketTable({ tickets, responsables, perfil, title, soloMios, page, pageSize, totalCount }: Props) {
  const router = useRouter()
  const [estadoFiltro, setEstadoFiltro] = useState<string>('Todos')
  const [areaFiltro, setAreaFiltro] = useState<string>('Todas')
  const [busqueda, setBusqueda] = useState('')
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const totalPages = Math.ceil(totalCount / pageSize)
  const basePath = soloMios ? '/mis-tickets' : '/dashboard'

  const counts = useMemo(() => {
    const c: Record<string, number> = {}
    tickets.forEach(t => { c[t.estado] = (c[t.estado] || 0) + 1 })
    return c
  }, [tickets])

  const ticketsPorResponsable = useMemo(() => {
    const c: Record<string, number> = {}
    tickets.forEach(t => {
      if (t.estado !== 'Resuelto' && t.responsable_id) {
        c[t.responsable_id] = (c[t.responsable_id] || 0) + 1
      }
    })
    return c
  }, [tickets])

  const filtrados = useMemo(() => {
    return tickets.filter(t => {
      if (estadoFiltro !== 'Todos' && t.estado !== estadoFiltro) return false
      if (areaFiltro !== 'Todas' && t.area_afectada !== areaFiltro) return false
      if (busqueda) {
        const q = busqueda.toLowerCase()
        if (
          !t.numero?.toLowerCase().includes(q) &&
          !t.mail_solicitante?.toLowerCase().includes(q) &&
          !t.proveedor?.toLowerCase().includes(q) &&
          !t.descripcion?.toLowerCase().includes(q) &&
          !t.responsable_nombre?.toLowerCase().includes(q)
        ) return false
      }
      return true
    })
  }, [tickets, estadoFiltro, areaFiltro, busqueda])

  const afterUpdate = () => {
    setSelected(null)
    router.refresh()
  }

  const goToPage = (p: number) => {
    router.push(`${basePath}?page=${p}`)
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este ticket? Esta acción no se puede deshacer.')) return
    setDeleteLoading(true)
    setDeleteId(id)
    await fetch('/api/tickets/delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    })
    setDeleteId(null)
    setDeleteLoading(false)
    router.refresh()
  }

  return (
    <div className="p-8 fade-up">
      {/* Header */}
      <div className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900" style={{ fontFamily: 'var(--font)' }}>
            {title}
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {totalCount.toLocaleString()} tickets en total · mostrando {((page) * pageSize) + 1}–{Math.min((page + 1) * pageSize, totalCount)}
          </p>
        </div>
      </div>

      {/* KPI chips */}
      <div className="flex flex-wrap gap-2 mb-5">
        {ESTADOS_ORDEN.map(e => {
          const cfg = ESTADO_CONFIG[e]
          const n = counts[e] || 0
          return (
            <button key={e} onClick={() => setEstadoFiltro(estadoFiltro === e ? 'Todos' : e)}
              className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                estadoFiltro === e ? `${cfg.bg} ${cfg.color} border-current` : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
              {cfg.label}
              <span className={cx('font-mono ml-0.5', estadoFiltro === e ? cfg.color : 'text-gray-400')}>{n}</span>
            </button>
          )
        })}
      </div>

      {/* Panel responsables */}
      {!soloMios && responsables.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-5">
          {responsables.map(r => {
            const n = ticketsPorResponsable[r.id] || 0
            const color = avatarColor(r.nombre)
            return (
              <div key={r.id} className="flex items-center gap-2 px-3 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600">
                <div style={{ width: 20, height: 20, borderRadius: '50%', background: color, color: 'white', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {r.nombre.charAt(0)}
                </div>
                {r.nombre}
                {n > 0
                  ? <span style={{ background: color, color: 'white', borderRadius: 9999, padding: '1px 7px', fontSize: 11, fontWeight: 700 }}>{n}</span>
                  : <span className="text-gray-300 font-mono">0</span>
                }
              </div>
            )
          })}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-5">
        <div className="relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar ticket, proveedor, mail…"
            className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg bg-white focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 w-72"
          />
        </div>
        <div className="flex rounded-lg border border-gray-200 bg-white overflow-hidden">
          {AREAS_FILTRO.map(a => (
            <button key={a} onClick={() => setAreaFiltro(a)}
              className={cx('px-3 py-2 text-xs font-medium transition-all border-r border-gray-200 last:border-r-0',
                areaFiltro === a ? 'bg-gray-900 text-white' : 'text-gray-500 hover:bg-gray-50'
              )}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">Sin tickets que coincidan</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Nro', 'Estado', 'Área', 'Solicitante', 'Proveedor', 'Responsable', 'Fecha', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtrados.map((t, i) => {
                const cfg = ESTADO_CONFIG[t.estado] || ESTADO_CONFIG['Recibido']
                const areaCfg = AREA_CONFIG[t.area_afectada] || AREA_CONFIG['Otro']
                const respColor = t.responsable_nombre ? avatarColor(t.responsable_nombre) : '#9ca3af'
                return (
                  <tr key={t.id}
                    onClick={() => setSelected(t)}
                    className={cx('border-b border-gray-50 cursor-pointer hover:bg-gray-50 transition-colors', i % 2 === 0 ? '' : 'bg-gray-50/30')}>
                    <td className="px-4 py-3"><span className="font-mono text-xs font-medium text-gray-700">{t.numero || '—'}</span></td>
                    <td className="px-4 py-3">
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                        {cfg.label}
                      </span>
                      {t.estado === 'Resuelto' && t.tipo_ticket && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>{t.tipo_ticket}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cx('px-2 py-0.5 rounded text-xs font-medium', areaCfg.badge)}>{t.area_afectada}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 max-w-[160px] truncate">{t.mail_solicitante}</td>
                    <td className="px-4 py-3 text-gray-700 max-w-[140px] truncate">{t.proveedor || '—'}</td>
                    <td className="px-4 py-3">
                      {t.responsable_nombre
                        ? <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                              style={{ background: respColor, color: 'white', fontSize: '10px' }}>
                              {t.responsable_nombre.charAt(0)}
                            </div>
                            <span className="text-gray-700">{t.responsable_nombre}</span>
                          </div>
                        : <span className="text-gray-300 text-xs">Sin asignar</span>}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">{formatFecha(t.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={e => handleDelete(t.id, e)}
                        disabled={deleteId === t.id}
                        title="Eliminar ticket"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#d1d5db', padding: '4px', borderRadius: 6, lineHeight: 1 }}
                        className="hover:text-red-400 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs text-gray-400">
            Página {page + 1} de {totalPages} · {totalCount.toLocaleString()} tickets
          </p>
          <div className="flex items-center gap-1">
            <button onClick={() => goToPage(0)} disabled={page === 0}
              className="px-2 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">«</button>
            <button onClick={() => goToPage(page - 1)} disabled={page === 0}
              className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">‹ Anterior</button>

            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              const start = Math.max(0, Math.min(page - 2, totalPages - 5))
              const p = start + i
              return (
                <button key={p} onClick={() => goToPage(p)}
                  className={cx('px-3 py-1.5 text-xs rounded border transition-colors',
                    p === page ? 'bg-gray-900 text-white border-gray-900' : 'border-gray-200 hover:bg-gray-50'
                  )}>
                  {p + 1}
                </button>
              )
            })}

            <button onClick={() => goToPage(page + 1)} disabled={page >= totalPages - 1}
              className="px-3 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">Siguiente ›</button>
            <button onClick={() => goToPage(totalPages - 1)} disabled={page >= totalPages - 1}
              className="px-2 py-1.5 text-xs rounded border border-gray-200 disabled:opacity-30 hover:bg-gray-50 transition-colors">»</button>
          </div>
        </div>
      )}

      {selected && (
        <TicketModal
          ticket={selected}
          responsables={responsables}
          perfil={perfil}
          onClose={() => setSelected(null)}
          onUpdated={afterUpdate}
        />
      )}
    </div>
  )
}
