import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
})

function baseTemplate(content: string) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f5f9; margin: 0; padding: 0; }
    .wrap { max-width: 600px; margin: 40px auto; }
    .header { background: #0f1117; border-radius: 12px 12px 0 0; padding: 28px 32px; }
    .header-logo { display: flex; align-items: center; gap: 10px; }
    .logo-icon { width: 36px; height: 36px; background: #4f6ef7; border-radius: 8px; display: inline-flex; align-items: center; justify-content: center; }
    .logo-text { color: white; font-size: 16px; font-weight: 600; }
    .logo-sub { color: #8b92a5; font-size: 11px; font-family: monospace; }
    .body { background: white; padding: 32px; }
    .footer { background: #f4f5f9; border-radius: 0 0 12px 12px; padding: 16px 32px; text-align: center; color: #9ca3af; font-size: 12px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 600; }
    .field-label { font-size: 11px; font-weight: 700; color: #9ca3af; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .field-value { font-size: 14px; color: #1a1d2e; margin-bottom: 16px; }
    .divider { border: none; border-top: 1px solid #f0f0f0; margin: 20px 0; }
    .btn { display: inline-block; background: #4f6ef7; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="header">
      <div class="header-logo">
        <div class="logo-icon">📋</div>
        <div>
          <div class="logo-text">Tickets</div>
          <div class="logo-sub">BBDD & Tarifas · Sayhueque</div>
        </div>
      </div>
    </div>
    <div class="body">${content}</div>
    <div class="footer">Sistema de Tickets BBDD & Tarifas · Sayhueque</div>
  </div>
</body>
</html>`
}

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
}) {
  const areaBadge: Record<string, string> = {
    'Tarifas': 'background:#ede9fe;color:#6d28d9',
    'Base de Datos': 'background:#e0f2fe;color:#0369a1',
    'Otro': 'background:#f3f4f6;color:#374151',
  }
  const badge = areaBadge[ticket.area_afectada] || areaBadge['Otro']

  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a1d2e;">🆕 Nuevo ticket recibido</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Se acaba de crear un nuevo ticket en el sistema.</p>

    <div style="background:#f8f9ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;border-left:3px solid #4f6ef7;">
      <span style="font-family:monospace;font-size:18px;font-weight:700;color:#4f6ef7;">${ticket.numero}</span>
      &nbsp;&nbsp;
      <span class="badge" style="${badge}">${ticket.area_afectada}</span>
    </div>

    <div class="field-label">Solicitante</div>
    <div class="field-value">${ticket.mail_solicitante}</div>

    ${ticket.proveedor ? `<div class="field-label">Proveedor</div><div class="field-value">${ticket.proveedor}${ticket.ciudad ? ` · ${ticket.ciudad}` : ''}</div>` : ''}
    ${ticket.tipo_servicio ? `<div class="field-label">Tipo de servicio</div><div class="field-value">${ticket.tipo_servicio}</div>` : ''}
    ${ticket.fechas_servicio ? `<div class="field-label">Fechas</div><div class="field-value">${ticket.fechas_servicio}</div>` : ''}
    ${ticket.motivo_tarifas ? `<div class="field-label">Motivo Tarifas</div><div class="field-value">${ticket.motivo_tarifas}</div>` : ''}
    ${ticket.motivo_bd ? `<div class="field-label">Motivo BBDD</div><div class="field-value">${ticket.motivo_bd}</div>` : ''}

    <hr class="divider">
    <div class="field-label">Descripción</div>
    <div style="background:#f9fafb;border-radius:8px;padding:14px;font-size:14px;color:#374151;line-height:1.6;">${ticket.descripcion}</div>

    <div style="margin-top:24px;">
      <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'}/dashboard" class="btn">
        Ver en el sistema →
      </a>
    </div>
  `

  await transporter.sendMail({
    from: `"Tickets BBDD" <${process.env.GMAIL_USER}>`,
    to: 'tarifas@sayhueque.com',
    subject: `[${ticket.numero}] Nuevo ticket · ${ticket.area_afectada}`,
    html: baseTemplate(content),
  })
}

export async function mailTicketAsignado(ticket: {
  numero: string
  mail_solicitante: string
  area_afectada: string
  descripcion: string
  proveedor?: string
  responsable_nombre: string
  comentario?: string
}) {
  const content = `
    <h2 style="margin:0 0 4px;font-size:20px;color:#1a1d2e;">✅ Tu ticket está siendo atendido</h2>
    <p style="color:#6b7280;margin:0 0 24px;font-size:14px;">Tu solicitud fue recibida y asignada a un responsable.</p>

    <div style="background:#f8f9ff;border-radius:8px;padding:16px 20px;margin-bottom:20px;border-left:3px solid #4f6ef7;">
      <span style="font-family:monospace;font-size:18px;font-weight:700;color:#4f6ef7;">${ticket.numero}</span>
    </div>

    <div class="field-label">Responsable asignado</div>
    <div style="font-size:16px;font-weight:600;color:#1a1d2e;margin-bottom:16px;">👤 ${ticket.responsable_nombre}</div>

    ${ticket.proveedor ? `<div class="field-label">Proveedor</div><div class="field-value">${ticket.proveedor}</div>` : ''}

    <hr class="divider">
    <div class="field-label">Tu descripción</div>
    <div style="background:#f9fafb;border-radius:8px;padding:14px;font-size:14px;color:#374151;line-height:1.6;">${ticket.descripcion}</div>

    ${ticket.comentario ? `
    <hr class="divider">
    <div class="field-label">Comentario del equipo</div>
    <div style="background:#fffbeb;border-radius:8px;padding:14px;font-size:14px;color:#374151;line-height:1.6;">${ticket.comentario}</div>
    ` : ''}

    <p style="margin-top:24px;font-size:13px;color:#9ca3af;">Te notificaremos cuando tu ticket sea resuelto.</p>
  `

  await transporter.sendMail({
    from: `"Tickets BBDD" <${process.env.GMAIL_USER}>`,
    to: ticket.mail_solicitante,
    subject: `[${ticket.numero}] Tu ticket está siendo atendido por ${ticket.responsable_nombre}`,
    html: baseTemplate(content),
  })
}
