'use client'

import { useState, useEffect } from 'react'
import type { Ticket, Perfil, Estado } from '@/lib/types'
import { ESTADO_CONFIG, ESTADOS_ORDEN, AREA_CONFIG, TIPOS_TICKET, formatFecha, cx } from '@/lib/types'

interface Props {
  ticket: Ticket
  responsables: { id: string; nombre: string; mail: string }[]
  perfil: Perfil
  onClose: () => void
  onUpdated: () => void
}

export default function TicketModal({ ticket, responsables, perfil, onClose, onUpdated }: Props) {
  const [loading, setLoading] = useState(false)
  const [responsableId, setResponsableId] = useState(ticket.responsable_id || '')
  const [estado, setEstado] = useState<Estado>(ticket.estado)
  const [comentario, setComentario] = useState('')
  const [tipoTicket, setTipoTicket] = useState(ticket.tipo_ticket || '')
  const [error, setError] = useState('')

  // Auto-cambiar a Asignado cuando se elige responsable
  useEffect(() => {
    if (responsableId && responsableId !== ticket.responsable_id) {
      if (estado === 'Recibido') setEstado('Asignado')
    }
  }, [responsableId])

  const cfg = ESTADO_CONFIG[estado]
  const areaCfg = AREA_CONFIG[ticket.area_afectada] || AREA_CONFIG['Otro']

  const handleGuardar = async () => {
    if (estado === 'Resuelto' && !tipoTicket) {
      setError('Seleccioná el tipo de ticket antes de resolver')
      return
    }
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/tickets/${ticket.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responsable_id: responsableId || null,
          estado,
          comentario: comentario || undefined,
          tipo_ticket: tipoTicket || undefined,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        setError(d.error || 'Error al guardar')
      } else {
        onUpdated()
      }
    } catch {
      setError('Error de conexión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col fade-up"
        style={{ maxHeight: 'calc(100vh - 48px)' }}>

        {/* Header fijo */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="font-mono text-sm font-semibold text-gray-500">{ticket.numero}</span>
              <span className={cx('px-2 py-0.5 rounded text-xs font-medium', areaCfg.badge)}>
                {ticket.area_afectada}
              </span>
              <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />
                {cfg.label}
              </span>
            </div>
            <p className="text-gray-400 text-xs">{formatFecha(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors shrink-0">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body scrolleable */}
        <div className="overflow-y-auto flex-1 p-6 space-y-5">

          {/* Info del solicitante */}
          <div className="grid grid-cols-2 gap-4">
            <Field label="Solicitante" value={ticket.mail_solicitante} />
            {ticket.proveedor && <Field label="Proveedor" value={ticket.proveedor} />}
            {ticket.ciudad && <Field label="Ciudad" value={ticket.ciudad} />}
            {ticket.tipo_servicio && <Field label="Tipo de servicio" value={ticket.tipo_servicio} />}
            {ticket.fechas_servicio && <Field label="Fechas" value={ticket.fechas_servicio} />}
            {ticket.motivo_tarifas && <Field label="Motivo Tarifas" value={ticket.motivo_tarifas} />}
            {ticket.motivo_bd && <Field label="Motivo BBDD" value={ticket.motivo_bd} />}
          </div>

          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Descripción</p>
            <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{ticket.descripcion}</p>
          </div>

          {ticket.imagen_url && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Adjunto</p>
              <a href={ticket.imagen_url} target="_blank" rel="noreferrer"
                className="text-sm text-blue-600 hover:underline break-all">{ticket.imagen_url}</a>
            </div>
          )}

          {ticket.comentario_asignacion && (
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Comentario asignación</p>
              <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-3">{ticket.comentario_asignacion}</p>
            </div>
          )}

          <hr className="border-gray-100" />

          {/* Gestión */}
          <div className="space-y-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Gestión del ticket</p>

            {/* Responsable — auto-cambia estado a Asignado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsable</label>
              <select value={responsableId} onChange={e => setResponsableId(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50">
                <option value="">Sin asignar</option>
                {responsables.map(r => (
                  <option key={r.id} value={r.id}>{r.nombre} — {r.mail}</option>
                ))}
              </select>
              {responsableId && responsableId !== ticket.responsable_id && estado === 'Asignado' && (
                <p className="text-xs text-emerald-600 mt-1 flex items-center gap-1">
                  ✓ Se cambiará automáticamente a Asignado y se notificará por mail
                </p>
              )}
            </div>

            {/* Estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <div className="flex flex-wrap gap-2">
                {ESTADOS_ORDEN.map(e => {
                  const c = ESTADO_CONFIG[e]
                  return (
                    <button key={e} onClick={() => setEstado(e)}
                      className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        estado === e ? `${c.bg} ${c.color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      )}>
                      <span className={cx('w-1.5 h-1.5 rounded-full', c.dot)} />
                      {c.label}
                      {c.pausa && <span>⏸</span>}
                    </button>
                  )
                })}
              </div>
              {ESTADO_CONFIG[estado]?.pausa && (
                <p className="text-xs text-orange-600 mt-1.5">⏸ Este estado pausa el tiempo de resolución</p>
              )}
            </div>

            {/* Tipo ticket + comentario resolución (solo si Resuelto) */}
            {estado === 'Resuelto' && (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Tipo de ticket <span className="text-red-400">*</span>
                  </label>
                  <select value={tipoTicket} onChange={e => setTipoTicket(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50">
                    <option value="">Seleccioná el tipo…</option>
                    {TIPOS_TICKET.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Comentario de resolución <span className="text-gray-400 font-normal">(se envía al solicitante)</span>
                  </label>
                  <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                    rows={3}
                    placeholder="Describí cómo se resolvió el ticket…"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                  />
                </div>
              </>
            )}

            {/* Comentario general (solo si NO es Resuelto) */}
            {estado !== 'Resuelto' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Comentario (opcional)</label>
                <textarea value={comentario} onChange={e => setComentario(e.target.value)}
                  rows={2}
                  placeholder="Notas adicionales…"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-50 resize-none"
                />
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-100 rounded-lg px-4 py-3 text-sm text-red-600">{error}</div>
          )}
        </div>

        {/* Footer fijo */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-100 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors">
            Cancelar
          </button>
          <button onClick={handleGuardar} disabled={loading}
            className="px-5 py-2 text-sm font-medium text-white rounded-lg transition-all disabled:opacity-60"
            style={{ background: 'var(--accent)' }}>
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
      <p className="text-sm text-gray-700">{value}</p>
    </div>
  )
}
