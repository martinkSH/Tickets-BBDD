'use client'

import { useState } from 'react'
import type { Ticket } from '@/lib/types'
import { ESTADO_CONFIG, AREA_CONFIG, TIPOS_TICKET, formatFecha, cx } from '@/lib/types'

interface Props {
  ticket: Ticket
  onUpdate: () => void
}

export default function TicketCard({ ticket, onUpdate }: Props) {
  const [open, setOpen] = useState(false)
  const [showResolver, setShowResolver] = useState(false)
  const [comentario, setComentario] = useState('')
  const [tipo, setTipo] = useState(ticket.tipo_ticket ?? '')
  const [loading, setLoading] = useState(false)

  const estadoCfg = ESTADO_CONFIG[ticket.estado]
  const areaCfg = AREA_CONFIG[ticket.area_afectada] ?? AREA_CONFIG['Otro']

  const resolver = async () => {
    if (!comentario.trim()) return
    setLoading(true)
    await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'resolver', comentario_solucion: comentario, tipo_ticket: tipo || null }),
    })
    setLoading(false)
    setShowResolver(false)
    onUpdate()
  }

  return (
    <div className={cx(
      'bg-white rounded-xl border shadow-sm hover:shadow-md transition-all',
      ticket.estado === 'Resuelto'  ? 'border-emerald-200 opacity-75' :
      ticket.estado === 'Asignado'  ? 'border-amber-200' : 'border-slate-200'
    )}>
      <div className="p-4">
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-mono text-xs font-semibold text-brand-700 bg-brand-50 px-2 py-0.5 rounded">
              {ticket.numero}
            </span>
            <span className={cx('text-xs px-2 py-0.5 rounded-full font-medium', areaCfg.badge)}>
              {ticket.area_afectada}
            </span>
          </div>
          <span className={cx('text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 shrink-0', estadoCfg.bg, estadoCfg.text)}>
            <span className={cx('w-1.5 h-1.5 rounded-full', estadoCfg.dot)} />
            {estadoCfg.label}
          </span>
        </div>

        <p className="text-sm text-slate-700 line-clamp-2 leading-snug">{ticket.descripcion}</p>
        {ticket.resumen_servicio && (
          <p className="text-xs text-slate-400 mt-1 truncate">{ticket.resumen_servicio}</p>
        )}

        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-slate-400">{formatFecha(ticket.created_at)}</span>
          <button onClick={() => setOpen(o => !o)}
            className="text-xs text-brand-600 hover:text-brand-800 font-medium">
            {open ? 'Ver menos ↑' : 'Ver más ↓'}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-slate-100 px-4 py-3 space-y-3 animate-fadeIn">
          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
            <Row label="Solicitante" v={ticket.mail_solicitante} />
            {ticket.motivo_tarifas && <Row label="Motivo Tarifas" v={ticket.motivo_tarifas} />}
            {ticket.motivo_bd      && <Row label="Motivo BD"      v={ticket.motivo_bd} />}
            {ticket.proveedor      && <Row label="Proveedor"      v={ticket.proveedor} />}
            {ticket.ciudad         && <Row label="Ciudad"         v={ticket.ciudad} />}
            {ticket.tipo_servicio  && <Row label="Tipo servicio"  v={ticket.tipo_servicio} />}
            {ticket.fechas_servicio&& <Row label="Fechas"         v={ticket.fechas_servicio} />}
            {ticket.tipo_ticket    && <Row label="Tipo ticket"    v={ticket.tipo_ticket} />}
          </div>

          {ticket.comentario_asignacion && (
            <div className="bg-amber-50 rounded-lg px-3 py-2 text-xs text-amber-800">
              <b>Nota de asignación: </b>{ticket.comentario_asignacion}
            </div>
          )}
          {ticket.comentario_solucion && (
            <div className="bg-emerald-50 rounded-lg px-3 py-2 text-xs text-emerald-800">
              <b>Resolución: </b>{ticket.comentario_solucion}
            </div>
          )}
          {ticket.imagen_url && (
            <a href={ticket.imagen_url} target="_blank" rel="noopener noreferrer"
              className="text-xs text-brand-600 hover:underline flex items-center gap-1">
              🔗 Ver adjunto
            </a>
          )}

          {/* Acción resolver */}
          {ticket.estado === 'Asignado' && !showResolver && (
            <button onClick={() => setShowResolver(true)}
              className="w-full py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors">
              ✓ Marcar como resuelto
            </button>
          )}
          {showResolver && (
            <div className="space-y-2 animate-fadeIn">
              <textarea rows={3} value={comentario} onChange={e => setComentario(e.target.value)}
                placeholder="Describí cómo fue resuelto..."
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500 resize-none" />
              <select value={tipo} onChange={e => setTipo(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-brand-500">
                <option value="">Clasificar tipo (opcional)</option>
                {TIPOS_TICKET.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <div className="flex gap-2">
                <button onClick={() => setShowResolver(false)}
                  className="flex-1 py-2 rounded-lg border border-slate-200 text-slate-600 text-xs hover:bg-slate-50">
                  Cancelar
                </button>
                <button onClick={resolver} disabled={loading || !comentario.trim()}
                  className="flex-1 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50">
                  {loading ? 'Guardando...' : 'Confirmar'}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function Row({ label, v }: { label: string; v: string }) {
  return <div><span className="text-slate-400">{label}: </span><span className="text-slate-700">{v}</span></div>
}
