'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import type { Ticket, Perfil } from '@/lib/types'
import { ESTADO_CONFIG, cx } from '@/lib/types'
import NavBar from './NavBar'
import TicketCard from './TicketCard'

const ESTADOS = ['Recibido', 'Asignado', 'Resuelto'] as const

interface Props {
  perfil: Perfil
  ticketsIniciales: Ticket[]
}

export default function TableroResponsable({ perfil, ticketsIniciales }: Props) {
  const router = useRouter()
  const [tickets, setTickets] = useState(ticketsIniciales)
  const [area, setArea] = useState<'todos' | 'Tarifas' | 'Base de Datos'>('todos')
  const [q, setQ] = useState('')

  const refresh = useCallback(async () => {
    router.refresh()
    // Optimistic: reload tickets via page refresh
  }, [router])

  const filtrados = tickets.filter(t => {
    const okArea = area === 'todos' || t.area_afectada === area
    const okQ = !q ||
      t.numero?.toLowerCase().includes(q.toLowerCase()) ||
      t.descripcion.toLowerCase().includes(q.toLowerCase()) ||
      t.mail_solicitante.toLowerCase().includes(q.toLowerCase()) ||
      (t.proveedor ?? '').toLowerCase().includes(q.toLowerCase())
    return okArea && okQ
  })

  return (
    <div className="min-h-screen bg-slate-50">
      <NavBar perfil={perfil} />

      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {ESTADOS.map(e => {
            const cfg = ESTADO_CONFIG[e]
            const count = tickets.filter(t => t.estado === e).length
            return (
              <div key={e} className={cx('rounded-xl px-4 py-3 border', cfg.bg, cfg.border)}>
                <div className="flex items-center justify-between">
                  <span className={cx('text-xs font-medium', cfg.text)}>{cfg.label}</span>
                  <span className={cx('text-2xl font-bold', cfg.text)}>{count}</span>
                </div>
              </div>
            )
          })}
        </div>

        {/* Filtros */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <input type="text" value={q} onChange={e => setQ(e.target.value)}
              placeholder="Buscar..."
              className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500" />
            <svg className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          {(['todos', 'Tarifas', 'Base de Datos'] as const).map(a => (
            <button key={a} onClick={() => setArea(a)}
              className={cx('px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors',
                area === a ? 'bg-brand-600 text-white border-brand-600' : 'bg-white text-slate-600 border-slate-200 hover:border-brand-400'
              )}>
              {a === 'todos' ? 'Todas las áreas' : a}
            </button>
          ))}
        </div>

        {/* Kanban */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {ESTADOS.map(estado => {
            const cfg = ESTADO_CONFIG[estado]
            const cols = filtrados.filter(t => t.estado === estado)
            return (
              <div key={estado}>
                <div className={cx('flex items-center gap-2 mb-3 px-3 py-2 rounded-xl border', cfg.bg, cfg.border)}>
                  <span className={cx('w-2 h-2 rounded-full', cfg.dot)} />
                  <span className={cx('text-sm font-semibold', cfg.text)}>{cfg.label}</span>
                  <span className={cx('ml-auto text-xs font-mono font-bold', cfg.text)}>{cols.length}</span>
                </div>
                <div className="space-y-3">
                  {cols.length === 0 ? (
                    <div className="text-center py-10 text-slate-300 text-sm border-2 border-dashed border-slate-200 rounded-xl">
                      Sin tickets
                    </div>
                  ) : cols.map(t => (
                    <TicketCard key={t.id} ticket={t} onUpdate={refresh} />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      </main>
    </div>
  )
}
