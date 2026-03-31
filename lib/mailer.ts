import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

const AREA_COLOR: Record<string, string> = {
  'Tarifas':       '#6d28d9',
  'Base de Datos': '#0369a1',
  'Otro':          '#374151',
}

const AREA_BG: Record<string, string> = {
  'Tarifas':       '#1e1040',
  'Base de Datos': '#0c1a2e',
  'Otro':          '#1a1d2e',
}

function template({
  headerBg,
  headerTag,
  headerTitle,
  headerSub,
  rows,
  description,
  descriptionLabel,
  comentario,
  comentarioLabel,
  btnText,
  btnHref,
  footerNote,
}: {
  headerBg: string
  headerTag: string
  headerTitle: string
  headerSub: string
  rows: { label: string; value: string }[]
  description?: string
  descriptionLabel?: string
  comentario?: string
  comentarioLabel?: string
  btnText: string
  btnHref: string
  footerNote?: string
}) {
  const rowsHtml = rows.map(r => `
    <tr>
      <td style="padding:8px 0;font-size:13px;font-weight:600;color:#374151;width:180px;vertical-align:top;">${r.label}:</td>
      <td style="padding:8px 0;font-size:13px;color:#111827;vertical-align:top;">${r.value}</td>
    </tr>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
  <div style="max-width:560px;margin:40px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">

    <!-- Header -->
    <div style="background:${headerBg};padding:28px 32px;">
      <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:${headerTag};text-transform:uppercase;letter-spacing:0.08em;">
        BBDD &amp; Tarifas · Sayhueque
      </p>
      <h1 style="margin:0 0 6px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.2;">${headerTitle}</h1>
      <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.6);font-family:monospace;">${headerSub}</p>
    </div>

    <!-- Body -->
    <div style="background:#ffffff;padding:28px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        ${rowsHtml}
      </table>

      ${description ? `
      <div style="margin-top:20px;padding-top:20px;border-top:1px solid #f0f0f0;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">${descriptionLabel || 'Descripción'}</p>
        <div style="background:#f9fafb;border-radius:8px;padding:14px;font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${(description||"").replace(/\n/g,"<br>")}</div>
      </div>
      ` : ''}

      ${comentario ? `
      <div style="margin-top:16px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">${comentarioLabel || 'Comentario'}</p>
        <div style="background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;padding:14px;font-size:13px;color:#374151;line-height:1.6;">${comentario}</div>
      </div>
      ` : ''}

      <div style="margin-top:24px;">
        <a href="${btnHref}" style="display:inline-block;background:#4f6ef7;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;">${btnText}</a>
      </div>
    </div>

    <!-- Footer -->
    <div style="background:#f9fafb;padding:14px 32px;border-top:1px solid #f0f0f0;">
      <p style="margin:0;font-size:12px;color:#9ca3af;">${footerNote || 'Sistema de Tickets BBDD &amp; Tarifas — mensaje automático'}</p>
    </div>

  </div>
</body>
</html>`
}

// ─── 1. Nuevo ticket → tarifas@sayhueque.com ─────────────────────────────────
export async function mailNuevoTicket(ticket: {
  numero: string
  mail_solicitante: string
  area_afectada: string
  descripcion: string
  proveedor?: string
  ciudad?: string
  tipo_servicio?: string
  fechas_servicio?: string
  motivo_tarifas?: string
  motivo_bd?: string
}, destinatarios: string[] = ['tarifas@sayhueque.com']) {
  const rows = [
    { label: 'Solicitante', value: ticket.mail_solicitante },
    ...(ticket.proveedor ? [{ label: 'Proveedor', value: ticket.proveedor }] : []),
    ...(ticket.ciudad ? [{ label: 'Ciudad / Destino', value: ticket.ciudad }] : []),
    ...(ticket.tipo_servicio ? [{ label: 'Tipo de servicio', value: ticket.tipo_servicio }] : []),
    ...(ticket.fechas_servicio ? [{ label: 'Fechas', value: ticket.fechas_servicio }] : []),
    ...(ticket.motivo_tarifas ? [{ label: 'Motivo Tarifas', value: ticket.motivo_tarifas }] : []),
    ...(ticket.motivo_bd ? [{ label: 'Motivo BBDD', value: ticket.motivo_bd }] : []),
  ]

  const html = template({
    headerBg: AREA_BG[ticket.area_afectada] || '#1a1d2e',
    headerTag: AREA_COLOR[ticket.area_afectada] || '#9ca3af',
    headerTitle: 'Nuevo ticket recibido',
    headerSub: `${ticket.numero} · ${ticket.area_afectada}`,
    rows,
    description: ticket.descripcion,
    btnText: 'Ver en el sistema →',
    btnHref: `${APP_URL}/dashboard`,
    footerNote: 'Este ticket requiere ser asignado a un responsable.',
  })

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: destinatarios.join(','),
    subject: `[${ticket.numero}] Nuevo ticket · ${ticket.area_afectada}`,
    html,
  })
}

// ─── 2. Ticket asignado → responsable ────────────────────────────────────────
export async function mailTicketAsignadoResponsable(ticket: {
  numero: string
  area_afectada: string
  descripcion: string
  mail_solicitante: string
  proveedor?: string
  ciudad?: string
  tipo_servicio?: string
  fechas_servicio?: string
  responsable_mail: string
  responsable_nombre: string
  comentario?: string
}) {
  const rows = [
    { label: 'Solicitante', value: ticket.mail_solicitante },
    ...(ticket.proveedor ? [{ label: 'Proveedor', value: ticket.proveedor }] : []),
    ...(ticket.ciudad ? [{ label: 'Ciudad / Destino', value: ticket.ciudad }] : []),
    ...(ticket.tipo_servicio ? [{ label: 'Tipo de servicio', value: ticket.tipo_servicio }] : []),
    ...(ticket.fechas_servicio ? [{ label: 'Fechas', value: ticket.fechas_servicio }] : []),
  ]

  const html = template({
    headerBg: AREA_BG[ticket.area_afectada] || '#1a1d2e',
    headerTag: AREA_COLOR[ticket.area_afectada] || '#9ca3af',
    headerTitle: 'Te asignaron un ticket',
    headerSub: `${ticket.numero} · ${ticket.area_afectada}`,
    rows,
    description: ticket.descripcion,
    comentario: ticket.comentario,
    comentarioLabel: 'Comentario de asignación',
    btnText: 'Ver mi ticket →',
    btnHref: `${APP_URL}/mis-tickets`,
    footerNote: 'Revisá el sistema para gestionar este ticket.',
  })

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: ticket.responsable_mail,
    subject: `[${ticket.numero}] Nuevo ticket asignado a vos`,
    html,
  })
}

// ─── 3. Ticket asignado → solicitante ────────────────────────────────────────
export async function mailTicketAsignadoSolicitante(ticket: {
  numero: string
  area_afectada: string
  descripcion: string
  mail_solicitante: string
  proveedor?: string
  responsable_nombre: string
  comentario?: string
}) {
  const rows = [
    { label: 'Número de ticket', value: ticket.numero },
    { label: 'Área', value: ticket.area_afectada },
    { label: 'Responsable asignado', value: ticket.responsable_nombre },
    ...(ticket.proveedor ? [{ label: 'Proveedor', value: ticket.proveedor }] : []),
  ]

  const html = template({
    headerBg: '#14532d',
    headerTag: '#86efac',
    headerTitle: 'Tu ticket está siendo atendido',
    headerSub: `${ticket.numero} · ${ticket.responsable_nombre}`,
    rows,
    description: ticket.descripcion,
    descriptionLabel: 'Tu consulta',
    btnText: 'Ver estado del ticket →',
    btnHref: `${APP_URL}/nuevo`,
    footerNote: 'Te notificaremos cuando tu ticket sea resuelto.',
  })

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: ticket.mail_solicitante,
    subject: `[${ticket.numero}] Tu ticket está siendo atendido por ${ticket.responsable_nombre}`,
    html,
  })
}

// ─── 4. Ticket resuelto → solicitante ────────────────────────────────────────
export async function mailTicketResuelto(ticket: {
  numero: string
  area_afectada: string
  descripcion: string
  mail_solicitante: string
  proveedor?: string
  responsable_nombre: string
  comentario_solucion?: string
  tipo_ticket?: string
}) {
  const rows = [
    { label: 'Número de ticket', value: ticket.numero },
    { label: 'Área', value: ticket.area_afectada },
    { label: 'Resuelto por', value: ticket.responsable_nombre },
    ...(ticket.proveedor ? [{ label: 'Proveedor', value: ticket.proveedor }] : []),
  ]

  const html = template({
    headerBg: '#064e3b',
    headerTag: '#6ee7b7',
    headerTitle: '✓ Tu ticket fue resuelto',
    headerSub: `${ticket.numero} · ${ticket.area_afectada}`,
    rows,
    description: ticket.descripcion,
    descriptionLabel: 'Tu consulta original',
    comentario: ticket.comentario_solucion,
    comentarioLabel: 'Resolución',
    btnText: 'Enviar nueva consulta →',
    btnHref: `${APP_URL}/nuevo`,
    footerNote: 'Si tenés otra consulta podés crear un nuevo ticket.',
  })

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: ticket.mail_solicitante,
    subject: `[${ticket.numero}] Tu ticket fue resuelto`,
    html,
  })
}
