import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

async function enviarMailNuevoTicketIT(t: any, mails: string[]) {
  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})

  const fila = (l: string, v: string) => v ? `
    <tr style="border-bottom:1px solid #f3f4f6">
      <td style="padding:8px 14px;font-weight:700;color:#6b7280;width:40%;font-size:13px">${esc(l)}</td>
      <td style="padding:8px 14px;color:#111827;font-size:13px">${esc(v)}</td>
    </tr>` : ''

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px">
    <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Ticket IT</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px">🖥️ Nuevo ticket IT — ${esc(t.numero||'')}</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        ${fila('Solicitante', t.mail_solicitante)}
        ${fila('Sistema', t.sistema)}
        ${t.modulo_tourplan   ? fila('Módulo Tourplan', t.modulo_tourplan) : ''}
        ${t.modulo_pythagoras ? fila('Módulo Pythagoras', t.modulo_pythagoras) : ''}
        ${t.modulo_b2c        ? fila('Módulo B2C', t.modulo_b2c) : ''}
        ${t.codigo_file       ? fila('Código File', t.codigo_file) : ''}
        ${t.nro_voucher       ? fila('Nro. Voucher', t.nro_voucher) : ''}
        ${t.codigo_cliente_proveedor ? fila('Código Cliente/Proveedor', t.codigo_cliente_proveedor) : ''}
        ${t.codigo_producto   ? fila('Código Producto', t.codigo_producto) : ''}
        ${t.codigo_file_tourplan  ? fila('Código File Tourplan', t.codigo_file_tourplan) : ''}
        ${t.codigo_file_pythagoras ? fila('Código File Pythagoras', t.codigo_file_pythagoras) : ''}
        ${t.link_itinerario   ? fila('Link Itinerario', t.link_itinerario) : ''}
      </table>
      <div style="padding:14px;background:#f9fafb;border-top:1px solid #f0f0f0">
        <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#9ca3af;text-transform:uppercase">Descripción</p>
        <div style="font-size:13px;color:#374151;line-height:1.6;white-space:pre-wrap">${esc(t.descripcion)}</div>
      </div>
      ${t.imagen_url ? `<div style="padding:10px 14px"><a href="${t.imagen_url}" style="color:#4f6ef7;font-size:13px">Ver adjunto →</a></div>` : ''}
      <p style="margin:16px 14px;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
    </div>
  </div>`

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: mails.join(','),
    subject: `[${t.numero}] Nuevo ticket IT — ${t.sistema}`,
    html,
  })
}

async function autoAssignIT(supabase: any, ticketId: string, ticket: any) {
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key','auto_assign_enabled').single()
  if (!setting?.value) return

  // Solo responsables IT y admins
  const { data: responsables } = await supabase.from('perfiles')
    .select('id,nombre,mail')
    .eq('activo', true)
    .in('rol', ['responsable IT','responsable IT/BBDD','admin'])
  if (!responsables?.length) return

  const { data: abiertos } = await supabase.from('tickets_it').select('responsable_id')
    .neq('estado','Resuelto').not('responsable_id','is',null)
  const carga: Record<string,number> = {}
  for (const t of abiertos||[]) carga[t.responsable_id] = (carga[t.responsable_id]||0)+1

  const mejor = responsables.map((r:any)=>({...r, score: -Math.min((carga[r.id]||0)*5,30)}))
    .sort((a:any,b:any)=>b.score-a.score)[0]

  await supabase.from('tickets_it').update({
    responsable_id: mejor.id, estado: 'Asignado', assigned_at: new Date().toISOString()
  }).eq('id', ticketId)

  // Mail al responsable asignado
  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: mejor.mail,
    subject: `[${ticket.numero}] Ticket IT asignado — ${ticket.sistema}`,
    html: `<div style="font-family:Arial,sans-serif;font-size:13px;max-width:500px">
      <div style="background:#0a0a0a;padding:16px 20px;border-radius:8px 8px 0 0">
        <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase">Atlas Archive · Ticket IT</p>
        <h2 style="margin:6px 0 0;color:white;font-size:16px">🖥️ Ticket IT asignado</h2>
      </div>
      <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px">
        <p>Hola <strong>${esc(mejor.nombre)}</strong>, se te asignó el siguiente ticket:</p>
        <p><strong>Número:</strong> ${esc(ticket.numero||'')}</p>
        <p><strong>Sistema:</strong> ${esc(ticket.sistema)}</p>
        <p><strong>Solicitante:</strong> ${esc(ticket.mail_solicitante)}</p>
        <p style="color:#9ca3af;font-size:12px;margin-top:16px">Say Hueque · Atlas Archive</p>
      </div>
    </div>`,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()

  const { data, error } = await supabase.from('tickets_it').insert({
    mail_solicitante:         body.mail_solicitante,
    sistema:                  body.sistema,
    modulo_tourplan:          body.modulo_tourplan,
    codigo_file:              body.codigo_file,
    nro_voucher:              body.nro_voucher,
    codigo_cliente_proveedor: body.codigo_cliente_proveedor,
    codigo_producto:          body.codigo_producto,
    modulo_pythagoras:        body.modulo_pythagoras,
    codigo_file_tourplan:     body.codigo_file_tourplan,
    codigo_file_pythagoras:   body.codigo_file_pythagoras,
    modulo_b2c:               body.modulo_b2c,
    link_itinerario:          body.link_itinerario,
    descripcion:              body.descripcion,
    imagen_url:               body.imagen_url,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail a destinatarios configurados
  try {
    const { data: setting } = await supabase.from('app_settings').select('value').eq('key','alerta_it_destinatarios').single()
    const mails: string[] = setting?.value?.length ? setting.value : ['martink@sayhueque.com']
    await enviarMailNuevoTicketIT(data, mails)
  } catch(e) { console.error('Mail IT error:', e) }

  // Auto-asignar
  try { await autoAssignIT(supabase, data.id, data) } catch(e) { console.error('Auto-assign IT error:', e) }

  return NextResponse.json({ ok: true, ticket: data })
}
