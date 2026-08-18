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
  // Estados que pone el sistema, no la persona: sólo se muestran si el ticket
  // ya está en ellos y no se pueden elegir a mano.
  sistema?: boolean
}

const ESTADOS_FIJOS: EstadoDyn[] = [
  { key: 'Recibido',           label: 'Recibido',       pausa: false, color: 'text-slate-600',   bg: 'bg-slate-100',   dot: 'bg-slate-400',   fijo: true },
  { key: 'Asignado',           label: 'Asignado',        pausa: false, color: 'text-orange-700',  bg: 'bg-orange-100',  dot: 'bg-orange-500',  fijo: true },
  { key: 'Pendiente Operador', label: 'Pend. Operador',  pausa: true,  color: 'text-orange-700',  bg: 'bg-orange-50',   dot: 'bg-orange-400',  fijo: true },
  { key: 'Pendiente Ventas',   label: 'Pend. Ventas',    pausa: true,  color: 'text-purple-700',  bg: 'bg-purple-50',   dot: 'bg-purple-400',  fijo: true },
  { key: 'Pendiente Conformidad', label: 'Esperando al solicitante', pausa: true, color: 'text-cyan-800', bg: 'bg-cyan-50', dot: 'bg-cyan-500', fijo: true, sistema: true },
  { key: 'Resuelto',           label: 'Cerrado',         pausa: false, color: 'text-emerald-800', bg: 'bg-emerald-100', dot: 'bg-emerald-600', fijo: true, sistema: true },
]

// Los maneja el ciclo de conformidad, no se eligen a mano. Los estados extra
// que se configuran en Settings se insertan antes de ellos.
const ESTADOS_FINALES = ['Pendiente Conformidad', 'Resuelto']

// Chip que reemplaza a "Resuelto" en el selector: resolver ya no cierra el
// ticket, lo manda a pedirle la conformidad al solicitante.
const RESOLVER: EstadoDyn = {
  key: 'Resuelto', label: 'Resolver', pausa: false,
  color: 'text-emerald-800', bg: 'bg-emerald-100', dot: 'bg-emerald-600', fijo: true,
}

const elegibles = (extras: EstadoDyn[] = []) => [
  ...ESTADOS_FIJOS.filter(e => !ESTADOS_FINALES.includes(e.key)),
  ...extras,
  RESOLVER,
]

const fmtFechaHora = (iso?: string) =>
  iso ? new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }) : '—'

const CERRADO_POR: Record<string, string> = {
  solicitante: 'lo cerró el solicitante',
  auto: 'se cerró solo por falta de respuesta',
  bbdd: 'lo cerró BBDD',
  legacy: 'cerrado antes de la conformidad',
}

interface Comentario {
  id: string
  autor_tipo: 'solicitante' | 'responsable'
  autor_mail?: string
  contenido: string
  created_at: string
}

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
  const [tiposTicket, setTiposTicket] = useState<string[]>([...TIPOS_TICKET].sort((a, b) => a.localeCompare(b, 'es')))
  const [estadosDyn, setEstadosDyn] = useState<EstadoDyn[]>(() => elegibles())
  const [comentarios, setComentarios] = useState<Comentario[]>([])
  const [respuesta, setRespuesta] = useState('')
  const [enviandoResp, setEnviandoResp] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  const cargarComentarios = () =>
    fetch(`/api/tickets/${ticket.id}/comentarios`)
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setComentarios(d) })
      .catch(() => {})

  useEffect(() => {
    setMounted(true)
    cargarComentarios()
    // Cargar settings dinámicos
    fetch('/api/settings').then(r => r.json()).then(data => {
      const tiposSetting = data.find((s: any) => s.key === 'tipos_ticket')
      if (tiposSetting?.value) setTiposTicket([...tiposSetting.value].sort((a: string, b: string) => a.localeCompare(b, 'es')))

      const estadosSetting = data.find((s: any) => s.key === 'estados_extra')
      if (estadosSetting?.value?.length) {
        const extras: EstadoDyn[] = estadosSetting.value.map((e: any, i: number) => ({
          key: e.key,
          label: e.label,
          pausa: e.pausa,
          fijo: false,
          ...DYN_COLORS[i % DYN_COLORS.length],
        }))
        setEstadosDyn(elegibles(extras))
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (responsableId && responsableId !== ticket.responsable_id) {
      if (estado === 'Recibido') setEstado('Asignado')
    }
  }, [responsableId])

  const estadoActual = estadosDyn.find(e => e.key === estado) || ESTADOS_FIJOS.find(e => e.key === estado)

  // Estados en los que BBDD ya dio su respuesta y el bloque de resolución
  // tiene que estar visible (para cargarla o para corregirla).
  const resolviendo = ESTADOS_FINALES.includes(estado)
  const esperandoConformidad = ticket.estado === 'Pendiente Conformidad'
  const cerrado = ticket.estado === 'Resuelto'

  const handleSave = async () => {
    if (resolviendo && !tipoTicket) {
      setError('Seleccioná el tipo de ticket para resolver'); return
    }
    if (resolviendo && !comentarioSolucion.trim()) {
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

  // Responder en el hilo es independiente de "Guardar cambios": se manda solo
  // y le llega al solicitante por mail con el link a su página del ticket.
  const handleResponder = async () => {
    const texto = respuesta.trim()
    if (!texto) return
    setEnviandoResp(true); setError('')
    try {
      const res = await fetch(`/api/tickets/${ticket.id}/comentarios`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contenido: texto }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setError(data.error || 'No se pudo enviar la respuesta'); return }
      setRespuesta('')
      await cargarComentarios()
    } finally {
      setEnviandoResp(false)
    }
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
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{ticket.descripcion}</p>
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

          {/* Dónde está el ciclo de conformidad */}
          {esperandoConformidad && (
            <div style={{ background: '#ecfeff', border: '1px solid #a5f3fc', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ margin: '0 0 3px', fontSize: 13, fontWeight: 600, color: '#0e7490' }}>
                ⏳ Esperando la conformidad de {ticket.mail_solicitante}
              </p>
              <p style={{ margin: 0, fontSize: 12.5, color: '#155e75', lineHeight: 1.5 }}>
                Se le pidió el {fmtFechaHora(ticket.conformidad_pedida_at)}. Si no responde, se cierra
                solo a las 72 hs hábiles. El ticket ya cuenta como resuelto en las estadísticas.
              </p>
            </div>
          )}

          {cerrado && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '12px 14px' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#15803d' }}>
                ✓ Cerrado el {fmtFechaHora(ticket.fecha_cierre || ticket.fecha_resolucion)}
                {ticket.cerrado_por && ` — ${CERRADO_POR[ticket.cerrado_por] || ticket.cerrado_por}`}
              </p>
            </div>
          )}

          {/* Estado */}
          <div>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 500, color: '#374151', marginBottom: 6 }}>Estado</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {estadosDyn.map(e => {
                // 'Pendiente Conformidad' no está en la lista (lo pone el
                // sistema), pero el chip de resolver tiene que verse activo.
                const active = estado === e.key || (e.key === 'Resuelto' && resolviendo)
                return (
                  <button key={e.key} onClick={() => setEstado(e.key)}
                    className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? `${e.bg} ${e.color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    )}>
                    <span className={cx('w-1.5 h-1.5 rounded-full', e.dot)} />
                    {/* Ya cerrado, el chip no "resuelve": deja el ticket como está */}
                    {e.key === 'Resuelto' && cerrado ? 'Cerrado' : e.label}
                    {e.pausa && <span style={{ fontSize: 10 }}>⏸</span>}
                  </button>
                )
              })}
            </div>
            {estadoActual?.pausa && !resolviendo && (
              <p style={{ fontSize: 12, color: '#ea580c', marginTop: 6 }}>⏸ Este estado pausa el tiempo de resolución</p>
            )}
            {estado === 'Resuelto' && !cerrado && (
              <p style={{ fontSize: 12, color: '#0e7490', marginTop: 6 }}>
                Al guardar se le pide la conformidad al solicitante; el ticket no queda cerrado todavía.
              </p>
            )}
            {(esperandoConformidad || cerrado) && !ESTADOS_FINALES.includes(estado) && (
              <p style={{ fontSize: 12, color: '#ea580c', marginTop: 6 }}>
                ⚠ Al guardar, el ticket se reabre y deja de contar como resuelto.
              </p>
            )}
          </div>

          {/* Resolución */}
          {resolviendo && (
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
                <p style={{ margin: '4px 0 0', fontSize: 11, color: '#16a34a' }}>
                  {esperandoConformidad || cerrado
                    ? 'Corregir este texto no le vuelve a escribir al solicitante; usá la conversación de abajo.'
                    : 'Este comentario se enviará por mail al solicitante.'}
                </p>
              </div>
            </div>
          )}

          {ticket.comentario_solucion && ticket.fecha_resolucion && !resolviendo && (
            <div style={{ background: '#fafafa', border: '1px solid #e5e7eb', borderRadius: 8, padding: '10px 14px' }}>
              <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase' }}>Solución anterior</p>
              <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>{ticket.comentario_solucion}</p>
            </div>
          )}

          {/* Conversación con el solicitante */}
          <div>
            <p style={{ margin: '0 0 8px', fontSize: 12, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Conversación con el solicitante{comentarios.length > 0 && ` (${comentarios.length})`}
            </p>

            {comentarios.length === 0 ? (
              <p style={{ margin: '0 0 10px', fontSize: 12.5, color: '#9ca3af' }}>
                Todavía no hay mensajes. Lo que escribas acá le llega por mail con el link a su ticket.
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 10 }}>
                {comentarios.map(c => {
                  const delSolicitante = c.autor_tipo === 'solicitante'
                  return (
                    <div key={c.id} style={{
                      background: delSolicitante ? '#fff7ed' : '#f9fafb',
                      border: `1px solid ${delSolicitante ? '#fed7aa' : '#f0f0f0'}`,
                      borderRadius: 8, padding: '10px 12px',
                    }}>
                      <p style={{ margin: '0 0 4px', fontSize: 11, fontWeight: 700, color: delSolicitante ? '#c2410c' : '#6b7280' }}>
                        {delSolicitante ? `${c.autor_mail || 'Solicitante'} (solicitante)` : (c.autor_mail || 'BBDD')} · {fmtFechaHora(c.created_at)}
                      </p>
                      <p style={{ margin: 0, fontSize: 13, color: '#374151', whiteSpace: 'pre-wrap' }}>{c.contenido}</p>
                    </div>
                  )
                })}
              </div>
            )}

            <textarea value={respuesta} onChange={e => setRespuesta(e.target.value)}
              rows={2} placeholder="Escribile al solicitante…"
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6 }}>
              <button onClick={handleResponder} disabled={enviandoResp || !respuesta.trim()}
                style={{ padding: '7px 16px', fontSize: 12.5, fontWeight: 600, border: 'none', borderRadius: 8, color: 'white', background: respuesta.trim() && !enviandoResp ? '#4f6ef7' : '#c7d2fe', cursor: respuesta.trim() && !enviandoResp ? 'pointer' : 'not-allowed' }}>
                {enviandoResp ? 'Enviando…' : 'Enviar al solicitante'}
              </button>
              <span style={{ fontSize: 11.5, color: '#9ca3af' }}>Se envía solo, sin necesidad de guardar el ticket.</span>
            </div>
          </div>

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
