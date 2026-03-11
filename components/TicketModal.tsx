'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import type { Ticket, Perfil } from '@/lib/types'
import { ESTADO_CONFIG, ESTADOS_ORDEN, AREA_CONFIG, TIPOS_TICKET, formatFecha, cx } from '@/lib/types'

// Estado dinámico extendido
interface EstadoDyn {
  key: string
  label: string
  pausa: boolean
  color: string
  bg: string
  dot: string
  fijo: boolean
}

const ESTADOS_FIJOS: EstadoDyn[] = [
  { key: 'Recibido',           label: 'Recibido',       pausa: false, color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400',   fijo: true },
  { key: 'Asignado',           label: 'Asignado',        pausa: false, color: 'text-orange-700',  bg: 'bg-orange-100',  dot: 'bg-orange-500',  fijo: true },
  { key: 'Pendiente Operador', label: 'Pend. Operador',  pausa: true,  color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-400',  fijo: true },
  { key: 'Pendiente Ventas',   label: 'Pend. Ventas',    pausa: true,  color: 'text-purple-700',  bg: 'bg-purple-50',   dot: 'bg-purple-400',  fijo: true },
  { key: 'Resuelto',           label: 'Resuelto',        pausa: false, color: 'text-emerald-800', bg: 'bg-emerald-100', dot: 'bg-emerald-600', fijo: true },
]

const DYN_COLORS = [
  { color: 'text-cyan-700',  bg: 'bg-cyan-50',   dot: 'bg-cyan-400'   },
  { color: 'text-pink-700',  bg: 'bg-pink-50',   dot: 'bg-pink-400'   },
  { color: 'text-teal-700',  bg: 'bg-teal-50',   dot: 'bg-teal-400'   },
  { color: 'text-lime-700',  bg: 'bg-lime-50',   dot: 'bg-lime-400'   },
  { color: 'text-rose-700',  bg: 'bg-rose-50',   dot: 'bg-rose-400'   },
]

interface Props {
  ticket: Ticket
  responsables: { id: string; nombre: string; mail: string }[]
  perfil: Perfil
  onClose: () => void
  onUpdated: () => void
}

export default function TicketModal({ ticket, responsables, perfil, onClose, onUpdated }: Props) {
  const [responsableId, setResponsableId] = useState(ticket.responsable_id || '')
  const [comentarioAsignacion, setComentarioAsignacion] = useState(ticket.comentario_asignacion || '')
  const [estado, setEstado] = useState(ticket.estado as string)
  const [tipoTicket, setTipoTicket] = useState(ticket.tipo_ticket || '')
  const [comentarioSolucion, setComentarioSolucion] = useState(ticket.comentario_solucion || '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [mounted, setMounted] = useState(false)
  const [tiposTicket, setTiposTicket] = useState<string[]>([...TIPOS_TICKET])
  const [estadosDyn, setEstadosDyn] = useState<EstadoDyn[]>(ESTADOS_FIJOS)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    // Cargar settings dinámicos
    fetch('/api/settings').then(r => r.json()).then(data => {
      const tiposSetting = data.find((s: any) => s.key === 'tipos_ticket')
      if (tiposSetting?.value) setTiposTicket(tiposSetting.value)

      const estadosSetting = data.find((s: any) => s.key === 'estados_extra')
      if (estadosSetting?.value?.length) {
        const extras: EstadoDyn[] = estadosSetting.value.map((e: any, i: number) => ({
          key: e.key,
          label: e.label,
          pausa: e.pausa,
          fijo: false,
          ...DYN_COLORS[i % DYN_COLORS.length],
        }))
        // Insertar extras antes de Resuelto
        const sinResuelto = ESTADOS_FIJOS.filter(e => e.key !== 'Resuelto')
        const resuelto = ESTADOS_FIJOS.find(e => e.key === 'Resuelto')!
        setEstadosDyn([...sinResuelto, ...extras, resuelto])
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (responsableId && responsableId !== ticket.responsable_id) {
      if (estado === 'Recibido') setEstado('Asignado')
    }
  }, [responsableId])

  const estadoActual = estadosDyn.find(e => e.key === estado) || ESTADOS_FIJOS.find(e => e.key === estado)

  const handleSave = async () => {
    if (estado === 'Resuelto' && !tipoTicket) {
      setError('Seleccioná el tipo de ticket para resolver'); return
    }
    if (estado === 'Resuelto' && !comentarioSolucion.trim()) {
      setError('Agregá un comentario de solución'); return
    }
    setSaving(true); setError('')
    const res = await fetch(`/api/tickets/${ticket.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ responsable_id: responsableId || null, comentario_asignacion: comentarioAsignacion, estado, tipo_ticket: tipoTicket, comentario_solucion: comentarioSolucion }),
    })
    if (!res.ok) { setError('Error al guardar'); setSaving(false); return }
    onUpdated()
  }

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose()
  }

  const content = (
    <div ref={overlayRef} onClick={handleOverlayClick}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: '#6b7280', background: '#f3f4f6', padding: '2px 8px', borderRadius: 6 }}>{ticket.numero}</span>
              <span className={cx('px-2 py-0.5 rounded text-xs font-medium', AREA_CONFIG[ticket.area_afectada]?.badge)}>{ticket.area_afectada}</span>
            </div>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>Abierto por <strong style={{ color: '#374151' }}>{ticket.mail_solicitante}</strong> · {formatFecha(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 4, borderRadius: 6, lineHeight: 1 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Descripción */}
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: '14px 16px' }}>
            <p style={{ margin: '0 0 6px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Descripción</p>
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{ticket.descripcion}</p>
          </div>

          {/* Detalles */}
          {(ticket.proveedor || ticket.ciudad || ticket.tipo_servicio || ticket.fechas_servicio || ticket.motivo_tarifas || ticket.motivo_bd) && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px' }}>
              {[
                ['Proveedor', ticket.proveedor], ['Ciudad', ticket.ciudad],
                ['Tipo servicio', ticket.tipo_servicio], ['Fechas', ticket.fechas_servicio],
                ['Motivo', ticket.motivo_tarifas || ticket.motivo_bd],
              ].filter(([, v]) => v).map(([l, v]) => (
                <div key={l as string}>
                  <p style={{ margin: '0 0 2px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>{l}</p>
                  <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{v}</p>
                </div>
              ))}
            </div>
          )}

          {ticket.imagen_url && (
            <div>
              <p style={{ margin: '0 0 6px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Imagen adjunta</p>
              <a href={ticket.imagen_url} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: 13, color: '#4f6ef7' }}>Ver imagen →</a>
            </div>
          )}

          <hr style={{ margin: '4px 0', border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* Responsable */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Responsable</label>
            <select value={responsableId} onChange={e => setResponsableId(e.target.value)}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#374151', outline: 'none', background: 'white' }}>
              <option value="">Sin asignar</option>
              {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
            </select>
            {responsableId && responsableId !== ticket.responsable_id && estado === 'Asignado' && (
              <p style={{ fontSize: 12, color: '#059669', marginTop: 4 }}>✓ Se cambiará a Asignado y se notificará por mail</p>
            )}
          </div>

          {responsableId && (
            <div>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Comentario de asignación</label>
              <textarea value={comentarioAsignacion} onChange={e => setComentarioAsignacion(e.target.value)}
                rows={2} placeholder="Instrucciones para el responsable…"
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          )}

          {/* Estado */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Estado</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {estadosDyn.map(e => {
                const active = estado === e.key
                return (
                  <button key={e.key} onClick={() => setEstado(e.key)}
                    className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? `${e.bg} ${e.color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    )}>
                    <span className={cx('w-1.5 h-1.5 rounded-full', e.dot)} />
                    {e.label}
                    {e.pausa && <span style={{ fontSize: 10 }}>⏸</span>}
                  </button>
                )
              })}
            </div>
            {estadoActual?.pausa && (
              <p style={{ fontSize: 12, color: '#ea580c', marginTop: 6 }}>⏸ Este estado pausa el tiempo de resolución</p>
            )}
          </div>

          {/* Resolución */}
          {estado === 'Resuelto' && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
                  Tipo de ticket <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <select value={tipoTicket} onChange={e => setTipoTicket(e.target.value)}
                  style={{ width: '100%', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#374151', outline: 'none', background: 'white' }}>
                  <option value="">Seleccioná el tipo…</option>
                  {tiposTicket.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#166534', marginBottom: 6 }}>
                  Comentario de solución <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <textarea value={comentarioSolucion} onChange={e => setComentarioSolucion(e.target.value)}
                  rows={3} placeholder="Describí cómo se resolvió el ticket…"
                  style={{ width: '100%', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box', background: 'white' }} />
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#16a34a' }}>Este comentario se enviará por mail al solicitante.</p>
              </div>
            </div>
          )}

          {ticket.comentario_solucion && ticket.estado === 'Resuelto' && estado !== 'Resuelto' && (
            <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Solución anterior</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{ticket.comentario_solucion}</p>
            </div>
          )}

          {error && <p style={{ margin: 0, fontSize: 13, color: '#dc2626', background: '#fee2e2', padding: '8px 12px', borderRadius: 8 }}>{error}</p>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button onClick={onClose}
            style={{ padding: '8px 20px', fontSize: 13, fontWeight: 500, border: '1px solid #e5e7eb', borderRadius: 8, background: 'white', cursor: 'pointer', color: '#374151' }}>
            Cancelar
          </button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding: '8px 24px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 8, background: saving ? '#9ca3af' : '#4f6ef7', color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )

  return mounted ? createPortal(content, document.body) : null
}
