'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [responsableId, setResponsableId] = useState(ticket.responsable_id || '')
  const [estado, setEstado] = useState<Estado>(ticket.estado)
  const [comentario, setComentario] = useState('')
  const [tipoTicket, setTipoTicket] = useState(ticket.tipo_ticket || '')
  const [error, setError] = useState('')

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (responsableId && responsableId !== ticket.responsable_id && estado === 'Recibido') {
      setEstado('Asignado')
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

  const modal = (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        zIndex: 99999,
        background: 'rgba(0,0,0,0.6)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '32px 16px',
        overflowY: 'auto',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 80px rgba(0,0,0,0.35)',
          width: '100%',
          maxWidth: '660px',
          display: 'flex',
          flexDirection: 'column',
          flexShrink: 0,
        }}
      >
        {/* Header */}
        <div style={{ padding: '20px 24px 18px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '13px', fontWeight: 600, color: '#6b7280' }}>{ticket.numero}</span>
              <span className={cx('px-2 py-0.5 rounded text-xs font-medium', areaCfg.badge)}>{ticket.area_afectada}</span>
              <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />{cfg.label}
              </span>
            </div>
            <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{formatFecha(ticket.created_at)}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '2px', lineHeight: 1, flexShrink: 0 }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
          </button>
        </div>

        {/* Body — sin scroll, se expande naturalmente */}
        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '18px' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
            <Field label="Solicitante" value={ticket.mail_solicitante} />
            {ticket.proveedor && <Field label="Proveedor" value={ticket.proveedor} />}
            {ticket.ciudad && <Field label="Ciudad" value={ticket.ciudad} />}
            {ticket.tipo_servicio && <Field label="Tipo de servicio" value={ticket.tipo_servicio} />}
            {ticket.fechas_servicio && <Field label="Fechas" value={ticket.fechas_servicio} />}
            {ticket.motivo_tarifas && <Field label="Motivo Tarifas" value={ticket.motivo_tarifas} />}
            {ticket.motivo_bd && <Field label="Motivo BBDD" value={ticket.motivo_bd} />}
          </div>

          <div>
            <Label>Descripción</Label>
            <p style={{ fontSize: '13px', color: '#374151', background: '#f9fafb', borderRadius: '8px', padding: '10px 12px', lineHeight: 1.6, margin: 0 }}>{ticket.descripcion}</p>
          </div>

          {ticket.imagen_url && (
            <div>
              <Label>Adjunto</Label>
              <a href={ticket.imagen_url} target="_blank" rel="noreferrer" style={{ fontSize: '13px', color: '#4f6ef7', wordBreak: 'break-all' }}>{ticket.imagen_url}</a>
            </div>
          )}

          {ticket.comentario_asignacion && (
            <div>
              <Label>Comentario asignación</Label>
              <p style={{ fontSize: '13px', color: '#374151', background: '#fffbeb', borderLeft: '3px solid #f59e0b', borderRadius: '0 8px 8px 0', padding: '10px 12px', margin: 0 }}>{ticket.comentario_asignacion}</p>
            </div>
          )}

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0', margin: 0 }} />

          <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em', margin: 0 }}>Gestión del ticket</p>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Responsable</label>
            <select value={responsableId} onChange={e => setResponsableId(e.target.value)}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', background: 'white' }}>
              <option value="">Sin asignar</option>
              {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre} — {r.mail}</option>)}
            </select>
            {responsableId && responsableId !== ticket.responsable_id && estado === 'Asignado' && (
              <p style={{ fontSize: '12px', color: '#059669', marginTop: '4px' }}>✓ Se cambiará a Asignado y se notificará por mail</p>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Estado</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ESTADOS_ORDEN.map(e => {
                const c = ESTADO_CONFIG[e]
                const active = estado === e
                return (
                  <button key={e} onClick={() => setEstado(e)}
                    className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                      active ? `${c.bg} ${c.color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                    )}>
                    <span className={cx('w-1.5 h-1.5 rounded-full', c.dot)} />
                    {c.label}{c.pausa && ' ⏸'}
                  </button>
                )
              })}
            </div>
            {ESTADO_CONFIG[estado]?.pausa && <p style={{ fontSize: '12px', color: '#ea580c', marginTop: '6px' }}>⏸ Este estado pausa el tiempo de resolución</p>}
          </div>

          {estado === 'Resuelto' && <>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Tipo de ticket <span style={{ color: '#f87171' }}>*</span></label>
              <select value={tipoTicket} onChange={e => setTipoTicket(e.target.value)}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', background: 'white' }}>
                <option value="">Seleccioná el tipo…</option>
                {TIPOS_TICKET.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>
                Comentario de resolución <span style={{ fontSize: '11px', color: '#9ca3af', fontWeight: 400 }}>(se envía al solicitante)</span>
              </label>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={3}
                placeholder="Describí cómo se resolvió el ticket…"
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
          </>}

          {estado !== 'Resuelto' && (
            <div>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>Comentario (opcional)</label>
              <textarea value={comentario} onChange={e => setComentario(e.target.value)} rows={2}
                placeholder="Notas adicionales…"
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', outline: 'none', resize: 'none', boxSizing: 'border-box' }} />
            </div>
          )}

          {error && <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '10px 14px', fontSize: '13px', color: '#dc2626' }}>{error}</div>}
        </div>

        {/* Footer */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
          <button onClick={onClose} style={{ padding: '8px 16px', fontSize: '13px', color: '#6b7280', background: 'none', border: 'none', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={handleGuardar} disabled={loading}
            style={{ padding: '8px 20px', fontSize: '13px', fontWeight: 600, color: 'white', background: '#4f6ef7', border: 'none', borderRadius: '8px', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
            {loading ? 'Guardando…' : 'Guardar cambios'}
          </button>
        </div>
      </div>
    </div>
  )

  if (!mounted) return null
  return createPortal(modal, document.body)
}

function Label({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: '11px', fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{children}</p>
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <Label>{label}</Label>
      <p style={{ fontSize: '13px', color: '#1a1d2e', margin: 0 }}>{value}</p>
    </div>
  )
}
