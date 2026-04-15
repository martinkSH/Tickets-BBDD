import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

function htmlResponsable(ticket: any, responsable_nombre: string, comentario?: string) {
  const fila = (l: string, v: string) => v ? `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 14px;font-weight:700;color:#6b7280;width:38%;font-size:13px;vertical-align:top">${esc(l)}</td>
      <td style="padding:8px 14px;color:#111827;font-size:13px;vertical-align:top">${esc(v)}</td>
    </tr>` : ''

  const detalles = [
    ticket.modulo_tourplan   && fila('Módulo', ticket.modulo_tourplan),
    ticket.modulo_pythagoras && fila('Módulo', ticket.modulo_pythagoras),
    ticket.modulo_b2c        && fila('Módulo', ticket.modulo_b2c),
    ticket.codigo_file       && fila('Código File', ticket.codigo_file),
    ticket.nro_voucher       && fila('Nro. Voucher', ticket.nro_voucher),
    ticket.codigo_cliente_proveedor && fila('Cód. Cliente/Proveedor', ticket.codigo_cliente_proveedor),
    ticket.codigo_producto   && fila('Código Producto', ticket.codigo_producto),
    ticket.codigo_file_tourplan  && fila('Cód. File TP', ticket.codigo_file_tourplan),
    ticket.codigo_file_pythagoras && fila('Cód. File Pythagoras', ticket.codigo_file_pythagoras),
    ticket.link_itinerario   && fila('Link Itinerario', ticket.link_itinerario),
  ].filter(Boolean).join('')

  return `<div style="font-family:Arial,sans-serif;max-width:600px">
    <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Soporte IT</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px">🖥️ Ticket IT asignado a vos</h2>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:13px;font-family:monospace">${esc(ticket.numero)} · ${esc(ticket.sistema)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        ${fila('Solicitante', ticket.mail_solicitante)}
        ${fila('Sistema', ticket.sistema)}
        ${detalles}
      </table>
      <div style="padding:14px;background:#f9fafb;border-top:1px solid #f0f0f0">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Descripción del problema</p>
        <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(ticket.descripcion)}</div>
      </div>
      ${comentario ? `<div style="padding:14px;background:#f0f9ff;border-top:1px solid #bae6fd">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#0284c7;text-transform:uppercase">Comentario de asignación</p>
        <div style="font-size:13px;color:#374151;white-space:pre-wrap">${esc(comentario)}</div>
      </div>` : ''}
      <div style="padding:16px 24px;text-align:center;border-top:1px solid #f0f0f0">
        <a href="${APP_URL}/tickets-it" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver ticket en Atlas Archive →</a>
      </div>
      <p style="margin:12px 14px;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
    </div>
  </div>`
}

function htmlSolicitante(ticket: any, responsable_nombre: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:600px">
    <div style="background:#14532d;padding:20px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0;color:#86efac;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Soporte IT</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px">✓ Tu ticket IT está siendo atendido</h2>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:13px;font-family:monospace">${esc(ticket.numero)} · ${esc(ticket.sistema)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin-bottom:16px">
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;font-weight:700;color:#6b7280;width:40%;font-size:13px">Número de ticket</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;font-family:monospace;font-weight:700">${esc(ticket.numero)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;font-weight:700;color:#6b7280;font-size:13px">Sistema</td>
          <td style="padding:8px 0;color:#111827;font-size:13px">${esc(ticket.sistema)}</td>
        </tr>
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:8px 0;font-weight:700;color:#6b7280;font-size:13px">Responsable</td>
          <td style="padding:8px 0;color:#111827;font-size:13px;font-weight:600">${esc(responsable_nombre)}</td>
        </tr>
      </table>
      <div style="background:#f9fafb;border-radius:8px;padding:14px;margin-bottom:16px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Tu consulta</p>
        <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(ticket.descripcion)}</div>
      </div>
      <p style="margin:0;font-size:13px;color:#6b7280">Te notificaremos cuando tu ticket sea resuelto.</p>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
    </div>
  </div>`
}

function htmlResuelto(ticket: any, comentario_solucion?: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:560px">
    <div style="background:#064e3b;padding:20px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0;color:#6ee7b7;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Soporte IT</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px">✓ Tu ticket IT fue resuelto</h2>
      <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:13px;font-family:monospace">${esc(ticket.numero)} · ${esc(ticket.sistema)}</p>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
      ${comentario_solucion ? `
      <div style="background:#f0fdf4;border-radius:8px;padding:14px;margin-bottom:16px;border:1px solid #bbf7d0">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase">Resolución</p>
        <div style="font-size:13px;color:#374151;white-space:pre-wrap">${esc(comentario_solucion)}</div>
      </div>` : ''}
      <div style="background:#f9fafb;border-radius:8px;padding:14px">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Tu consulta original</p>
        <div style="font-size:13px;color:#374151;white-space:pre-wrap">${esc(ticket.descripcion)}</div>
      </div>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
    </div>
  </div>`
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json()
  const { sendMail, responsable_mail, responsable_nombre, prevResponsableId, ...rest } = body

  // Solo campos editables
  const updates: Record<string, any> = {}
  if (rest.estado !== undefined)               updates.estado = rest.estado
  if (rest.responsable_id !== undefined)        updates.responsable_id = rest.responsable_id || null
  if (rest.comentario_asignacion !== undefined) updates.comentario_asignacion = rest.comentario_asignacion
  if (rest.comentario_solucion !== undefined)   updates.comentario_solucion = rest.comentario_solucion
  if (rest.tipo_ticket !== undefined)           updates.tipo_ticket = rest.tipo_ticket

  // Auto estado Asignado
  if (updates.responsable_id && updates.estado === 'Recibido') updates.estado = 'Asignado'

  // Fecha resolución
  if (updates.estado === 'Resuelto' && !rest.fecha_resolucion) {
    updates.fecha_resolucion = new Date().toISOString()
  }

  // Fecha asignación
  if (updates.responsable_id && updates.responsable_id !== prevResponsableId) {
    updates.assigned_at = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('tickets_it').update(updates).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD }
  })

  const cambioResponsable = updates.responsable_id && updates.responsable_id !== prevResponsableId
  const ahoraResuelto = sendMail && updates.estado === 'Resuelto'

  // Mail al responsable — con todos los datos + link
  if (cambioResponsable && responsable_mail) {
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: responsable_mail,
        subject: `[${data.numero}] Ticket IT asignado a vos — ${data.sistema}`,
        html: htmlResponsable(data, responsable_nombre || '', rest.comentario_asignacion),
      })
    } catch(e) { console.error('Mail responsable IT:', e) }

    // Mail al solicitante — confirmación con nro, problema y responsable
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: data.mail_solicitante,
        subject: `[${data.numero}] Tu ticket IT está siendo atendido por ${responsable_nombre}`,
        html: htmlSolicitante(data, responsable_nombre || ''),
      })
    } catch(e) { console.error('Mail solicitante IT asignacion:', e) }
  }

  // Mail resolución al solicitante
  if (ahoraResuelto) {
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: data.mail_solicitante,
        subject: `[${data.numero}] Tu ticket IT fue resuelto`,
        html: htmlResuelto(data, updates.comentario_solucion),
      })
    } catch(e) { console.error('Mail resuelto IT:', e) }
  }

  return NextResponse.json({ ok: true, ticket: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('tickets_it').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
