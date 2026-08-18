import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import nodemailer from 'nodemailer'

const DESTINATARIOS = ['tarifas@sayhueque.com', 'martink@sayhueque.com']

function isBusinessTime(d: Date): boolean {
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  const h = d.getHours() + d.getMinutes() / 60
  return h >= 9 && h < 18
}

function businessHoursDiff(start: Date, end: Date): number {
  if (end <= start) return 0
  let totalMs = 0
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (current <= lastDay) {
    const dow = current.getDay()
    if (dow >= 1 && dow <= 5) {
      const ws = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 9, 0, 0)
      const we = new Date(current.getFullYear(), current.getMonth(), current.getDate(), 18, 0, 0)
      const iStart = new Date(Math.max(ws.getTime(), start.getTime()))
      const iEnd = new Date(Math.min(we.getTime(), end.getTime()))
      if (iEnd > iStart) totalMs += iEnd.getTime() - iStart.getTime()
    }
    current.setDate(current.getDate() + 1)
  }
  return totalMs / (1000 * 60 * 60)
}

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()
  const { data: tickets } = await supabase.from('tickets_con_responsable').select('*')
  if (!tickets) return NextResponse.json({ error: 'No data' }, { status: 500 })

  const now = new Date()
  const dow = now.getDay()
  if (dow === 0 || dow === 6) return NextResponse.json({ ok: true, msg: 'Fin de semana' })

  let recibidosHoy = 0, asignadosHoy = 0, resueltosHoy = 0
  let backlogPendiente = 0, backlogAsignado = 0
  const atrasados: { numero: string; responsable: string; estado: string; horas: number }[] = []

  for (const t of tickets) {
    const ts = new Date(t.created_at)
    const estado = t.estado as string
    const fechaSol = t.fecha_resolucion ? new Date(t.fecha_resolucion) : null

    if (sameDay(ts, now) && isBusinessTime(ts)) {
      recibidosHoy++
      if (['Asignado','Pendiente Operador','Pendiente Ventas'].includes(estado)) asignadosHoy++
    }
    // Resuelto = tiene fecha_resolucion. Un ticket en 'Pendiente Conformidad'
    // ya lo resolvió BBDD: cuenta en el resumen del día y no es atrasado.
    if (fechaSol && sameDay(fechaSol, now) && isBusinessTime(fechaSol)) resueltosHoy++
    if (estado === 'Recibido') backlogPendiente++
    if (['Asignado','Pendiente Operador','Pendiente Ventas'].includes(estado)) backlogAsignado++
    if (!fechaSol) {
      const diff = businessHoursDiff(ts, now)
      if (diff > 24) atrasados.push({ numero: t.numero, responsable: t.responsable_nombre || 'Sin asignar', estado, horas: diff })
    }
  }

  const fechaStr = now.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
  const horaStr = now.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })

  const atrasadosHTML = atrasados.length > 0
    ? `<table style="width:100%;border-collapse:collapse;margin-top:8px;">
        <tr style="background:#fee2e2;font-weight:600;font-size:12px;">
          <td style="padding:8px 12px;">Ticket</td><td style="padding:8px 12px;">Responsable</td><td style="padding:8px 12px;">Estado</td><td style="padding:8px 12px;">Hs hábiles</td>
        </tr>
        ${atrasados.sort((a,b)=>b.horas-a.horas).map(a=>`
        <tr style="border-bottom:1px solid #fecaca;">
          <td style="padding:8px 12px;font-family:monospace;font-weight:600;color:#dc2626;">${a.numero}</td>
          <td style="padding:8px 12px;font-size:13px;">${a.responsable}</td>
          <td style="padding:8px 12px;font-size:13px;">${a.estado}</td>
          <td style="padding:8px 12px;font-size:13px;font-weight:600;">${a.horas.toFixed(1)} hs</td>
        </tr>`).join('')}
      </table>`
    : `<p style="color:#059669;font-weight:600;margin:8px 0;">✓ Ningún ticket supera las 24 hs hábiles sin resolver.</p>`

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Segoe UI',Arial,sans-serif;">
<div style="max-width:580px;margin:32px auto;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10);">
  <div style="background:#0f1117;padding:24px 28px;">
    <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#4f6ef7;text-transform:uppercase;letter-spacing:0.08em;">BBDD & Tarifas · Sayhueque</p>
    <h1 style="margin:0 0 4px;font-size:20px;font-weight:700;color:#ffffff;">Resumen diario de tickets</h1>
    <p style="margin:0;font-size:13px;color:rgba(255,255,255,0.5);">${fechaStr} · Corte ${horaStr} hs</p>
  </div>
  <div style="background:#ffffff;padding:24px 28px;">
    <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 12px;">Semáforo del día (hs hábiles)</p>
    <div style="display:flex;gap:12px;margin-bottom:24px;">
      <div style="flex:1;background:#fff7ed;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#ea580c;">${recibidosHoy}</div>
        <div style="font-size:12px;color:#9a3412;margin-top:2px;">Recibidos hoy</div>
      </div>
      <div style="flex:1;background:#eff6ff;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#2563eb;">${asignadosHoy}</div>
        <div style="font-size:12px;color:#1e40af;margin-top:2px;">Asignados hoy</div>
      </div>
      <div style="flex:1;background:#f0fdf4;border-radius:10px;padding:14px;text-align:center;">
        <div style="font-size:28px;font-weight:700;color:#16a34a;">${resueltosHoy}</div>
        <div style="font-size:12px;color:#14532d;margin-top:2px;">Resueltos hoy</div>
      </div>
    </div>
    <p style="font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 10px;">Backlog actual</p>
    <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
      <tr style="background:#f9fafb;">
        <td style="padding:10px 12px;font-size:13px;">Sin asignar (Recibido)</td>
        <td style="padding:10px 12px;font-size:20px;font-weight:700;color:#374151;text-align:right;">${backlogPendiente}</td>
      </tr>
      <tr>
        <td style="padding:10px 12px;font-size:13px;">En curso (Asignado / Pendiente)</td>
        <td style="padding:10px 12px;font-size:20px;font-weight:700;color:#374151;text-align:right;">${backlogAsignado}</td>
      </tr>
    </table>
    <p style="font-size:11px;font-weight:700;color:#dc2626;text-transform:uppercase;letter-spacing:0.06em;margin:0 0 8px;">⏰ Tickets con +24 hs hábiles sin resolver</p>
    ${atrasadosHTML}
    <div style="margin-top:24px;text-align:center;">
      <a href="https://tickets-bbdd-muhz.vercel.app/dashboard" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;">Ver dashboard →</a>
    </div>
  </div>
  <div style="background:#f9fafb;padding:12px 28px;border-top:1px solid #f0f0f0;">
    <p style="margin:0;font-size:12px;color:#9ca3af;">Resumen automático diario · Sistema Tickets BBDD & Tarifas</p>
  </div>
</div>
</body></html>`

  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  await transporter.sendMail({
    from: `"Tickets BBDD" <${process.env.GMAIL_USER}>`,
    to: DESTINATARIOS.join(','),
    subject: `Resumen diario tickets – ${fechaStr}`,
    html,
  })

  return NextResponse.json({ ok: true, enviado: fechaStr })
}
