import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

async function enviarMailNuevoCliente(c: any, mails: string[]) {
  const transporter = createTransport({ service: 'gmail', auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD } })
  const fila = (l: string, v: string) => v ? `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 14px;font-weight:700;color:#6b7280;width:40%;font-size:13px">${esc(l)}</td><td style="padding:8px 14px;color:#111827;font-size:13px">${esc(v)}</td></tr>` : ''
  const catColor: Record<string,string> = { A:'#16a34a', B:'#2563eb', C:'#d97706', D:'#dc2626' }
  const html = `<div style="font-family:Arial,sans-serif;max-width:600px">
    <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
      <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Alta de Cliente</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px">👤 Nueva solicitud de alta</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse">
        ${fila('Tipo', c.tipo_cliente)}
        ${fila('Razón Social', c.razon_social)}
        ${fila('Nombre Fantasía', c.nombre_fantasia)}
        ${c.nombre_madre ? fila('Cliente Madre', c.nombre_madre) : ''}
        ${fila('Mail contacto', c.mail_contacto)}
        ${fila('Nombre contacto', c.nombre_contacto)}
        ${fila('Mail/Tel contacto', c.mail_telefono)}
        ${fila('Contacto interno', c.contacto_interno)}
        ${fila('Dirección', c.direccion)}
        ${fila('Sitio web', c.sitio_web)}
        ${c.categoria ? `<tr style="border-bottom:1px solid #f3f4f6"><td style="padding:8px 14px;font-weight:700;color:#6b7280;font-size:13px">Categoría</td><td style="padding:8px 14px"><span style="background:${catColor[c.categoria]||'#6b7280'};color:white;padding:2px 12px;border-radius:20px;font-size:12px;font-weight:700">${esc(c.categoria)}</span></td></tr>` : ''}
      </table>
      <p style="margin:16px 14px;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
    </div>
  </div>`
  await transporter.sendMail({ from: `"Atlas Archive" <${process.env.GMAIL_USER}>`, to: mails.join(','), subject: `[Alta Cliente] ${c.razon_social} — Cat. ${c.categoria||'?'}`, html })
}

async function autoAssignCliente(supabase: any, clienteId: string) {
  const { data: setting } = await supabase.from('app_settings').select('value').eq('key','auto_assign_enabled').single()
  if (!setting?.value) return
  const { data: responsables } = await supabase.from('perfiles').select('id,nombre,mail').eq('activo',true).eq('rol','responsable')
  if (!responsables?.length) return
  const { data: abiertos } = await supabase.from('clientes').select('responsable_id').neq('estado','Cargado').not('responsable_id','is',null)
  const carga: Record<string,number> = {}
  for (const c of abiertos||[]) carga[c.responsable_id] = (carga[c.responsable_id]||0)+1
  const mejor = responsables.map((r:any)=>({...r,score:-Math.min((carga[r.id]||0)*5,30)})).sort((a:any,b:any)=>b.score-a.score)[0]
  await supabase.from('clientes').update({ responsable_id: mejor.id, estado: 'Asignado' }).eq('id',clienteId)
  const { data: cl } = await supabase.from('clientes').select('*').eq('id',clienteId).single()
  if (cl && mejor.mail) {
    const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
    await transporter.sendMail({ from:`"Atlas Archive" <${process.env.GMAIL_USER}>`, to:mejor.mail, subject:`[Alta Cliente asignada] ${cl.razon_social}`,
      html:`<div style="font-family:Arial,sans-serif;font-size:13px;max-width:500px">
        <div style="background:#0a0a0a;padding:16px 20px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase">Atlas Archive · Alta Cliente</p>
          <h2 style="margin:6px 0 0;color:white;font-size:16px">👤 Alta de cliente asignada</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px">
          <p>Hola <strong>${esc(mejor.nombre)}</strong>, se te asignó el alta del siguiente cliente:</p>
          <p><strong>Razón Social:</strong> ${esc(cl.razon_social)}</p>
          <p><strong>Tipo:</strong> ${esc(cl.tipo_cliente)}</p>
          <p><strong>Categoría:</strong> ${esc(cl.categoria||'—')}</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">Say Hueque · Atlas Archive</p>
        </div>
      </div>`
    })
  }
}

export async function GET() {
  const supabase = createClient()
  const all: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase.from('clientes').select('*, responsable:responsable_id(id,nombre,mail)').range(from, from+99).order('created_at',{ascending:false})
    if (!data||data.length===0) break
    all.push(...data)
    if (data.length<100) break
    from+=100
  }
  return NextResponse.json(all)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { data, error } = await supabase.from('clientes').insert({
    mail_contacto: body.mail_contacto, tipo_cliente: body.tipo_cliente,
    nombre_madre: body.nombre_madre, nombre_fantasia: body.nombre_fantasia,
    direccion: body.direccion, razon_social: body.razon_social,
    nombre_contacto: body.nombre_contacto, mail_telefono: body.mail_telefono,
    contacto_interno: body.contacto_interno, sitio_web: body.sitio_web,
    logo_url: body.logo_url, categoria: body.categoria,
  }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  try {
    const { data: setting } = await supabase.from('app_settings').select('value').eq('key','alerta_destinatarios').single()
    const mails: string[] = setting?.value?.length ? setting.value : ['tarifas@sayhueque.com']
    await enviarMailNuevoCliente(data, mails)
  } catch(e) { console.error('Mail nuevo cliente:', e) }
  try { await autoAssignCliente(supabase, data.id) } catch(e) { console.error('Auto-assign cliente:', e) }
  return NextResponse.json({ ok: true, cliente: data })
}
