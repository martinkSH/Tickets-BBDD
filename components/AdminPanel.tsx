'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Ticket, Perfil } from '@/lib/types'
import { ESTADO_CONFIG, AREA_CONFIG, formatFecha, cx } from '@/lib/types'
import NavBar from './NavBar'

const ESTADOS = ['Recibido', 'Asignado', 'Resuelto'] as const

interface Props {
  perfil: Perfil
  ticketsIniciales: Ticket[]
  responsables: Perfil[]
}

export default function AdminPanel({ perfil, ticketsIniciales, responsables }: Props) {
  const router = useRouter()
  const [tickets, setTickets] = useState(ticketsIniciales)
  const [filtroEstado, setFiltroEstado] = useState<'todos' | typeof ESTADOS[number]>('todos')
  const [filtroArea, setFiltroArea] = useState<'todos' | 'Tarifas' | 'Base de Datos'>('todos')
  const [q, setQ] = useState('')

  // Modal de asignación
  const [asignando, setAsignando] = useState<Ticket | null>(null)
  const [responsableId, setResponsableId] = useState('')
  const [comentarioAsig, setComentarioAsig] = useState('')
  const [loadingAsig, setLoadingAsig] = useState(false)

  const refresh = useCallback(() => { router.refresh() }, [router])

  const filtrados = tickets.filter(t => {
    const okEstado = filtroEstado === 'todos' || t.estado === filtroEstado
    const okArea = filtroArea === 'todos' || t.area_afectada === filtroArea
    const okQ = !q ||
      t.numero?.toLowerCase().includes(q.toLowerCase()) ||
      t.descripcion.toLowerCase().includes(q.toLowerCase()) ||
      t.mail_solicitante.toLowerCase().includes(q.toLowerCase()) ||
      (t.responsable_nombre ?? '').toLowerCase().includes(q.toLowerCase()) ||
      (t.proveedor ?? '').toLowerCase().includes(q.toLowerCase())
    return okEstado && okArea && okQ
  })

  const confirmarAsignacion = async () => {
    if (!asignando || !responsableId) return
    setLoadingAsig(true)
    const res = await fetch(`/api/tickets/${asignando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'asignar',
        responsable_id: responsableId,
        comentario_asignacion: comentarioAsig || null,
      }),
    })
    setLoadingAsig(false)
    if (res.ok) {
      setAsignando(null)
      setResponsableId('')
      setComentarioAsig('')
      refresh()
      // Actualizar localmente
      const { ticket: updated } = await res.json()
      const resp = responsables.find(r => r.id === responsableId)
      setTickets(prev => prev.map(t => t.id === updated.id
        ? { ...t, ...updated, responsable_nombre: resp?.nombre, responsable_mail: resp?.mail }
        : t
      ))
    }
  }

  const countByEstado = (e: string) => tickets.filter(t => t.estado === e).length

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar perfil={perfil} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats globales */}
        <div className="grid grid-cols-3 gap-3 mb-6">
          {ESTADOS.map(e => {
            const cfg = ESTADO_CONFIG[e]
            return (
              <div key={e} className={cx('rounded-xl px-4 py-3 border', cfg.bg, cfg.border)}>
                <div className="flex items-center justify-between">
                  <span className={cx('text-xs font-medium', cfg.text)}>{cfg.label}</span>
                  <span className={cx('text-2xl font-bold', cfg.text)}>{countByEstado(e)}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <input type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar ticket, responsable, proveedor..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {(['todos', 'Recibido', 'Asignado', 'Resuelto'] as const).map(e => (
            <button key={e} onClick={() => setFiltroEstado(e)}
              className={cx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filtroEstado === e ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
              )}>
              {e === 'todos' ? 'Todos los estados' : e}
            </button>
          ))}
          {(['todos', 'Tarifas', 'Base de Datos'] as const).map(a => (
            <button key={a} onClick={() => setFiltroArea(a)}
              className={cx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                filtroArea === a ? 'bg-slate-700 text-white border-slate-700' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
              )}>
              {a === 'todos' ? 'Todas las áreas' : a}
            </button>
          ))}
        </div>

        {/* Tabla de tickets */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h2 className="font-semibold text-slate-700 text-sm">
              Todos los tickets <span className="text-slate-400 font-normal">({filtrados.length})</span>
            </h2>
          </div>

          {filtrados.length === 0 ? (
            <div className="text-center py-16 text-slate-300 text-sm">Sin tickets que coincidan con los filtros</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filtrados.map(ticket => {
                const estadoCfg = ESTADO_CONFIG[ticket.estado]
                const areaCfg = AREA_CONFIG[ticket.area_afectada] ?? AREA_CONFIG['Otro']
                return (
                  <div key={ticket.id} className="px-4 py-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start gap-3">
                      {/* Número */}
                      <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded shrink-0 mt-0.5">
                        {ticket.numero}
                      </span>

                      {/* Cuerpo */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-slate-700 truncate">{ticket.descripcion}</p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className={cx('text-xs px-1.5 py-0.5 rounded-full font-medium', areaCfg.badge)}>
                            {ticket.area_afectada}
                          </span>
                          <span className="text-xs text-slate-400">{ticket.mail_solicitante}</span>
                          {ticket.resumen_servicio && (
                            <span className="text-xs text-slate-400 truncate max-w-xs">{ticket.resumen_servicio}</span>
                          )}
                        </div>
                      </div>

                      {/* Estado + responsable + acciones */}
                      <div className="flex items-center gap-2 shrink-0">
                        {ticket.responsable_nombre && (
                          <span className="text-xs text-slate-500 hidden md:block">{ticket.responsable_nombre}</span>
                        )}
                        <span className={cx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1', estadoCfg.bg, estadoCfg.text)}>
                          <span className={cx('w-1.5 h-1.5 rounded-full', estadoCfg.dot)} />
                          {estadoCfg.label}
                        </span>
                        <span className="text-xs text-slate-400 hidden lg:block">{formatFecha(ticket.created_at)}</span>

                        {/* Botón asignar (solo si está Recibido) */}
                        {ticket.estado === 'Recibido' && (
                          <button
                            onClick={() => { setAsignando(ticket); setResponsableId(''); setComentarioAsig('') }}
                            className="text-xs px-2.5 py-1 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors">
                            Asignar
                          </button>
                        )}
                        {/* Botón reasignar */}
                        {ticket.estado === 'Asignado' && (
                          <button
                            onClick={() => { setAsignando(ticket); setResponsableId(ticket.responsable_id ?? ''); setComentarioAsig('') }}
                            className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                            Reasignar
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      {/* Modal de asignación */}
      {asignando && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md animate-fadeIn">
            <div className="p-6">
              <h3 className="font-semibold text-slate-800 mb-1">Asignar ticket</h3>
              <p className="text-xs text-slate-400 mb-4 font-mono">{asignando.numero} · {asignando.descripcion.slice(0, 60)}...</p>

              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Responsable</label>
                  <select value={responsableId} onChange={e => setResponsableId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500">
                    <option value="">Seleccionar responsable...</option>
                    {responsables.map(r => (
                      <option key={r.id} value={r.id}>{r.nombre}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Comentario de asignación <span className="text-slate-400 font-normal">(opcional)</span>
                  </label>
                  <textarea rows={3} value={comentarioAsig} onChange={e => setComentarioAsig(e.target.value)}
                    placeholder="Indicaciones para el responsable..."
                    className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
                </div>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={() => setAsignando(null)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm hover:bg-slate-50">
                Cancelar
              </button>
              <button onClick={confirmarAsignacion} disabled={loadingAsig || !responsableId}
                className="flex-1 py-2.5 rounded-xl bg-brand-600 text-white font-medium text-sm hover:bg-brand-700 disabled:opacity-50 transition-colors">
                {loadingAsig ? 'Asignando...' : 'Confirmar asignación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
