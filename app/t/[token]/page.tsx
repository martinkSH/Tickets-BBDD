'use client'

import { useEffect, useState } from 'react'
import { HORAS_CONFORMIDAD } from '@/lib/types'

// Vista del solicitante, sin login. El token del mail identifica al ticket.
// Ninguna acción ocurre al abrir esta página: cerrar y comentar son POST
// explícitos, porque los clientes de mail prefetchean los links.

const fmt = (iso?: string | null) =>
  iso ? new Date(iso).toLocaleString('es-AR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/Argentina/Buenos_Aires',
  }) : '—'

export default function TicketPublicoPage({ params }: { params: { token: string } }) {
  const [ticket, setTicket] = useState<any>(null)
  const [comentarios, setComentarios] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const [texto, setTexto] = useState('')
  const [mostrarComentario, setMostrarComentario] = useState(false)
  const [aviso, setAviso] = useState('')

  const cargar = async () => {
    const res = await fetch(`/api/publico/ticket?token=${encodeURIComponent(params.token)}`)
    const data = await res.json()
    if (data.error) { setError(data.error); setLoading(false); return }
    setTicket(data.ticket)
    setComentarios(data.comentarios || [])
    setLoading(false)
  }

  useEffect(() => { cargar() }, [])

  // El link del mail sólo preselecciona la intención, no ejecuta nada
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('a') === 'comentar') {
      setMostrarComentario(true)
    }
  }, [])

  const accion = async (accion: 'cerrar' | 'comentar') => {
    setEnviando(true)
    setAviso('')
    try {
      const res = await fetch('/api/publico/ticket', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: params.token, accion, contenido: texto }),
      })
      const data = await res.json()
      if (data.error) { setAviso(data.error); return }
      setTexto('')
      setMostrarComentario(false)
      await cargar()
    } catch {
      setAviso('No se pudo completar la acción. Probá de nuevo.')
    } finally {
      setEnviando(false)
    }
  }

  if (loading) return <Marco><p style={{ color: '#9ca3af' }}>Cargando tu ticket…</p></Marco>
  if (error) return (
    <Marco>
      <h1 style={{ fontSize: 20, margin: '0 0 8px', color: '#111827' }}>No encontramos este ticket</h1>
      <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
        El link puede estar incompleto o vencido. Escribinos a tarifas@sayhueque.com.
      </p>
    </Marco>
  )

  const cerrado = ticket.estado === 'Resuelto'
  const esperando = ticket.estado === 'Pendiente Conformidad'
  const motivo = ticket.motivo_tarifas || ticket.motivo_bd
  const contexto = [
    ticket.proveedor && `Proveedor: ${ticket.proveedor}`,
    ticket.ciudad && `Ciudad: ${ticket.ciudad}`,
    ticket.tipo_servicio && `Servicio: ${ticket.tipo_servicio}`,
    ticket.fechas_servicio && `Fechas: ${ticket.fechas_servicio}`,
  ].filter(Boolean).join(' · ')

  return (
    <Marco ancho>
      {/* Cabecera */}
      <div style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 16, marginBottom: 20 }}>
        <p style={{ margin: 0, fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
          BBDD &amp; Tarifas · Say Hueque
        </p>
        <h1 style={{ margin: '6px 0 0', fontSize: 22, fontWeight: 700, color: '#111827' }}>
          Ticket {ticket.numero}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8, flexWrap: 'wrap' }}>
          <Badge estado={ticket.estado} />
          <span style={{ fontSize: 12.5, color: '#9ca3af' }}>
            Creado el {fmt(ticket.created_at)}
            {ticket.responsable_nombre && ` · Atiende ${ticket.responsable_nombre}`}
          </span>
        </div>
      </div>

      {/* Consulta original */}
      <Bloque titulo="Tu consulta">
        {(ticket.area_afectada || motivo || contexto) && (
          <p style={{ margin: '0 0 8px', fontSize: 12, color: '#9ca3af' }}>
            {[ticket.area_afectada, motivo, contexto].filter(Boolean).join(' · ')}
          </p>
        )}
        <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.descripcion}</p>
      </Bloque>

      {/* Resolución */}
      {ticket.comentario_solucion && (
        <Bloque titulo={`Resolución${ticket.responsable_nombre ? ` de ${ticket.responsable_nombre}` : ''}`} verde>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{ticket.comentario_solucion}</p>
          <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>{fmt(ticket.fecha_resolucion)}</p>
        </Bloque>
      )}

      {/* Hilo */}
      {comentarios.length > 0 && (
        <div style={{ marginBottom: 20 }}>
          <p style={{ margin: '0 0 10px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Conversación</p>
          {comentarios.map(c => {
            const mio = c.autor_tipo === 'solicitante'
            return (
              <div key={c.id} style={{
                background: mio ? '#eef2ff' : '#f9fafb',
                border: `1px solid ${mio ? '#e0e7ff' : '#f0f0f0'}`,
                borderRadius: 10, padding: '12px 14px', marginBottom: 8,
              }}>
                <p style={{ margin: '0 0 6px', fontSize: 11.5, fontWeight: 700, color: mio ? '#4f46e5' : '#6b7280' }}>
                  {mio ? 'Vos' : (c.autor_mail || 'BBDD & Tarifas')} · {fmt(c.created_at)}
                </p>
                <p style={{ margin: 0, fontSize: 13.5, color: '#374151', whiteSpace: 'pre-wrap' }}>{c.contenido}</p>
              </div>
            )
          })}
        </div>
      )}

      {aviso && (
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '12px 14px', marginBottom: 16 }}>
          <p style={{ margin: 0, fontSize: 13, color: '#dc2626' }}>{aviso}</p>
        </div>
      )}

      {/* Acciones */}
      {cerrado ? (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px' }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 600, color: '#15803d' }}>✓ Este ticket está cerrado</p>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: '#166534' }}>
            {ticket.cerrado_por === 'auto'
              ? `Se cerró automáticamente al no recibir respuesta dentro de las ${HORAS_CONFORMIDAD} horas hábiles.`
              : `Cerrado el ${fmt(ticket.fecha_cierre)}.`}
            {' '}Si necesitás algo más, creá un ticket nuevo.
          </p>
          <a href="/nuevo" style={{ display: 'inline-block', marginTop: 12, background: '#4f6ef7', color: 'white', padding: '10px 20px', borderRadius: 8, textDecoration: 'none', fontSize: 13.5, fontWeight: 600 }}>
            Enviar nueva consulta →
          </a>
        </div>
      ) : esperando ? (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600, color: '#111827' }}>¿Quedó resuelto?</p>
          <p style={{ margin: '0 0 14px', fontSize: 13, color: '#6b7280' }}>
            Si no respondés, el ticket se cierra solo a las {HORAS_CONFORMIDAD} horas hábiles.
          </p>

          {!mostrarComentario ? (
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <button onClick={() => accion('cerrar')} disabled={enviando}
                style={{ background: '#16a34a', color: 'white', border: 'none', padding: '11px 22px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: enviando ? 'wait' : 'pointer' }}>
                {enviando ? 'Cerrando…' : '✓ Sí, cerrar ticket'}
              </button>
              <button onClick={() => setMostrarComentario(true)} disabled={enviando}
                style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '11px 22px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                💬 Tengo una duda
              </button>
            </div>
          ) : (
            <>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} autoFocus
                placeholder="Contanos qué quedó pendiente o qué no se entendió…"
                style={{ width: '100%', minHeight: 110, border: '1px solid #d1d5db', borderRadius: 8, padding: 12, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              <p style={{ margin: '6px 0 12px', fontSize: 12, color: '#9ca3af' }}>
                El ticket va a volver a {ticket.responsable_nombre || 'el equipo'}, que recibe tu comentario por mail.
              </p>
              <div style={{ display: 'flex', gap: 10 }}>
                <button onClick={() => accion('comentar')} disabled={enviando || !texto.trim()}
                  style={{ background: texto.trim() ? '#4f6ef7' : '#c7d2fe', color: 'white', border: 'none', padding: '11px 22px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: texto.trim() && !enviando ? 'pointer' : 'not-allowed' }}>
                  {enviando ? 'Enviando…' : 'Enviar comentario'}
                </button>
                <button onClick={() => { setMostrarComentario(false); setTexto('') }} disabled={enviando}
                  style={{ background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '11px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      ) : (
        <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 18px' }}>
          <p style={{ margin: '0 0 12px', fontSize: 13.5, color: '#374151' }}>
            Tu ticket está en curso. Te vamos a avisar por mail cuando tengamos una respuesta.
          </p>
          {!mostrarComentario ? (
            <button onClick={() => setMostrarComentario(true)}
              style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db', padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
              💬 Agregar un comentario
            </button>
          ) : (
            <>
              <textarea value={texto} onChange={e => setTexto(e.target.value)} autoFocus
                placeholder="Agregá información para el equipo…"
                style={{ width: '100%', minHeight: 100, border: '1px solid #d1d5db', borderRadius: 8, padding: 12, fontSize: 13.5, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
              <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                <button onClick={() => accion('comentar')} disabled={enviando || !texto.trim()}
                  style={{ background: texto.trim() ? '#4f6ef7' : '#c7d2fe', color: 'white', border: 'none', padding: '10px 20px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: texto.trim() && !enviando ? 'pointer' : 'not-allowed' }}>
                  {enviando ? 'Enviando…' : 'Enviar'}
                </button>
                <button onClick={() => { setMostrarComentario(false); setTexto('') }}
                  style={{ background: 'white', color: '#6b7280', border: '1px solid #e5e7eb', padding: '10px 18px', borderRadius: 8, fontSize: 13.5, fontWeight: 600, cursor: 'pointer' }}>
                  Cancelar
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </Marco>
  )
}

// ── Presentación ────────────────────────────────────────────────────────────
function Marco({ children, ancho }: { children: React.ReactNode; ancho?: boolean }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f3f4f6', fontFamily: "'Segoe UI',system-ui,sans-serif", padding: '40px 16px' }}>
      <div style={{ maxWidth: ancho ? 640 : 460, margin: '0 auto', background: 'white', borderRadius: 12, padding: '28px 32px', boxShadow: '0 4px 24px rgba(0,0,0,0.07)' }}>
        {children}
      </div>
    </div>
  )
}

function Bloque({ titulo, children, verde }: { titulo: string; children: React.ReactNode; verde?: boolean }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <p style={{ margin: '0 0 8px', fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{titulo}</p>
      <div style={{
        background: verde ? '#f0fdf4' : '#f9fafb',
        border: `1px solid ${verde ? '#bbf7d0' : '#f0f0f0'}`,
        borderRadius: 8, padding: 14, fontSize: 13.5, color: '#374151', lineHeight: 1.6,
      }}>{children}</div>
    </div>
  )
}

function Badge({ estado }: { estado: string }) {
  const cfg: Record<string, { txt: string; bg: string; color: string }> = {
    'Recibido': { txt: 'Recibido', bg: '#f1f5f9', color: '#475569' },
    'Asignado': { txt: 'En curso', bg: '#ffedd5', color: '#c2410c' },
    'Pendiente Operador': { txt: 'En curso', bg: '#ffedd5', color: '#c2410c' },
    'Pendiente Ventas': { txt: 'En curso', bg: '#f3e8ff', color: '#7e22ce' },
    'Pendiente Conformidad': { txt: 'Esperando tu confirmación', bg: '#cffafe', color: '#0e7490' },
    'Resuelto': { txt: 'Cerrado', bg: '#dcfce7', color: '#15803d' },
  }
  const c = cfg[estado] || { txt: estado, bg: '#f1f5f9', color: '#475569' }
  return (
    <span style={{ background: c.bg, color: c.color, fontSize: 12, fontWeight: 700, borderRadius: 20, padding: '4px 12px' }}>
      {c.txt}
    </span>
  )
}
