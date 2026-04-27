import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
function formatFecha(d?: string) {
  if (!d) return '—'
  const fecha = new Date(d + 'T12:00:00')
  const hoy = new Date(); hoy.setHours(0,0,0,0)
  const diff = Math.ceil((fecha.getTime() - hoy.getTime()) / 86400000)
  const label = fecha.toLocaleDateString('es-AR', { day:'2-digit', month:'short' })
  if (diff < 0) return `<span style="color:#dc2626;font-weight:700">${label} (vencida)</span>`
  if (diff === 0) return `<span style="color:#d97706;font-weight:700">${label} (hoy)</span>`
  if (diff <= 3) return `<span style="color:#d97706">${label} (en ${diff} días)</span>`
  return label
}
const PRIO: Record<string,string> = { urgente:'#dc2626', alta:'#ea580c', media:'#d97706', baja:'#9ca3af' }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const supabase = createClient()

  const { data: tareas } = await supabase
    .from('proyectos_tareas')
    .select('id, titulo, prioridad, fecha_vencimiento, asignado_id, asignado_a, asignado_externo_id, asignado_externo_nombre, asignado:asignado_id(nombre,mail), asignado_externo:asignado_externo_id(nombre,mail,token_personal), lista:lista_id(nombre), proyecto:proyecto_id(id,nombre,color,estado)')
    .not('proyecto_id', 'is', null)

  const filtradas = (tareas || []).filter((t: any) => {
    if ((t.proyecto as any)?.estado === 'completado') return false
    const l = (t.lista as any)?.nombre?.toLowerCase() || ''
    return !l.includes('complet') && !l.includes('done')
  })

  const porPersona: Record<string, { nombre: string; mail: string; link: string; tareas: any[] }> = {}
  for (const t of filtradas) {
    const a = t.asignado as any, e = t.asignado_externo as any
    let mail = a?.mail || e?.mail || t.asignado_a || null
    let nombre = a?.nombre || e?.nombre || t.asignado_externo_nombre || mail || ''
    let link = e?.token_personal ? `${APP_URL}/ext/${e.token_personal}` : `${APP_URL}/proyectos`
    if (!mail) continue
    if (!porPersona[mail]) porPersona[mail] = { nombre, mail, link, tareas: [] }
    porPersona[mail].tareas.push(t)
  }

  for (const p of Object.values(porPersona)) {
    p.tareas.sort((a: any, b: any) => {
      if (!a.fecha_vencimiento) return 1
      if (!b.fecha_vencimiento) return -1
      return new Date(a.fecha_vencimiento).getTime() - new Date(b.fecha_vencimiento).getTime()
    })
  }

  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
  let enviados = 0

  for (const { nombre, mail, link, tareas: ts } of Object.values(porPersona)) {
    const rows = ts.map((t: any) => `
      <tr style="border-bottom:1px solid #f3f4f6">
        <td style="padding:10px 12px;font-size:13px;vertical-align:top"><div style="font-weight:600">${esc((t.proyecto as any)?.nombre||'')}</div><div style="color:#6b7280;font-size:12px">${esc((t.lista as any)?.nombre||'')}</div></td>
        <td style="padding:10px 12px;font-size:13px;color:#374151;vertical-align:top">${esc(t.titulo)}</td>
        <td style="padding:10px 12px;font-size:11px;vertical-align:top;white-space:nowrap"><span style="background:${PRIO[t.prioridad]||'#9ca3af'}22;color:${PRIO[t.prioridad]||'#9ca3af'};border-radius:4px;padding:2px 6px;font-weight:700">${esc(t.prioridad||'media')}</span></td>
        <td style="padding:10px 12px;font-size:12px;vertical-align:top;white-space:nowrap">${formatFecha(t.fecha_vencimiento)}</td>
      </tr>`).join('')

    const html = `<div style="font-family:Arial,sans-serif;max-width:620px">
      <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
        <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Recordatorio diario</p>
        <h2 style="margin:6px 0 4px;color:white;font-size:18px">📋 Tus tareas pendientes</h2>
        <p style="margin:0;color:rgba(255,255,255,0.5);font-size:13px">${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'2-digit',month:'long'})}</p>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
        <div style="padding:14px 20px;background:#f9fafb;border-bottom:1px solid #f0f0f0">
          <p style="margin:0;font-size:13px;color:#374151">Hola <strong>${esc(nombre)}</strong>, tenés <strong>${ts.length}</strong> tarea${ts.length!==1?'s':''} pendiente${ts.length!==1?'s':''}:</p>
        </div>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
          <thead><tr style="background:#f9fafb">
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Proyecto</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Tarea</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Prioridad</th>
            <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Vencimiento</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <div style="padding:16px 20px;text-align:center;border-top:1px solid #f0f0f0">
          <a href="${link}" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver mis proyectos →</a>
        </div>
        <p style="margin:8px 14px 12px;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
      </div>
    </div>`

    try {
      await transporter.sendMail({ from:`"Atlas Archive" <${process.env.GMAIL_USER}>`, to:mail, subject:`📋 ${ts.length} tarea${ts.length!==1?'s':''} pendiente${ts.length!==1?'s':''} — ${new Date().toLocaleDateString('es-AR',{weekday:'long',day:'2-digit',month:'short'})}`, html })
      enviados++
    } catch(e) { console.error('cron mail error:', mail, e) }
  }
  return NextResponse.json({ ok: true, enviados })
}
