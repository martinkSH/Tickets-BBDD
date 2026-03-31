import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

async function enviarMailNuevoProveedor(p: any, mails: string[]) {
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })

  const fila = (label: string, value: string) => value ? `
    <tr style="border-bottom:1px solid #f3f4f6;">
      <td style="padding:8px 14px;font-weight:700;color:#6b7280;width:40%;font-size:13px">${esc(label)}</td>
      <td style="padding:8px 14px;color:#111827;font-size:13px">${esc(value)}</td>
    </tr>` : ''

  const html = `<div style="font-family:Arial,sans-serif;max-width:600px;">
    <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;text-transform:uppercase">Say Hueque · Alta de Proveedor</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px;">🏢 Nueva solicitud de alta</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:0;">
      <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;">
        ${fila('Razón Social', p.razon_social)}
        ${fila('Nombre de fantasía', p.nombre_fantasia)}
        ${fila('Mail contacto', p.mail_contacto)}
        ${fila('Teléfono', p.telefono)}
        ${fila('Ciudad', p.ciudad)}
        ${fila('País', p.pais)}
        ${fila('CUIT', p.cuit)}
        ${fila('Condición impositiva', p.condicion_impositiva)}
        ${fila('Forma de pago', p.forma_pago)}
        ${fila('Moneda', p.moneda_pago)}
        ${fila('Término de pago', p.termino_pago)}
        ${fila('Mail pagos', p.mail_pagos)}
        ${fila('Contacto Admin', p.contacto_admin)}
        ${fila('Contacto Comercial', p.contacto_comercial)}
        ${fila('Contacto Reservas', p.contacto_reservas)}
        ${fila('Tel. emergencias', p.telefono_emergencias)}
      </table>
      ${p.datos_bancarios ? `<div style="padding:12px 14px;background:#f9fafb;border-top:1px solid #f0f0f0"><p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Datos bancarios</p><p style="margin:0;font-size:13px;color:#374151">${esc(p.datos_bancarios)}</p></div>` : ''}
      <p style="margin:16px 14px;color:#9ca3af;font-size:12px;">Say Hueque · Atlas Archive de Base de Datos</p>
    </div>
  </div>`

  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: mails.join(','),
    subject: `[Alta Proveedor] ${p.razon_social} — ${p.pais || ''}`.trim(),
    html,
  })
}

export async function GET() {
  const supabase = createClient()
  const proveedores: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('proveedores')
      .select('*, responsable:responsable_id(nombre, mail)')
      .range(from, from + 99)
      .order('created_at', { ascending: false })
    if (!data || data.length === 0) break
    proveedores.push(...data)
    if (data.length < 100) break
    from += 100
  }
  return NextResponse.json(proveedores)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()

  const { data, error } = await supabase
    .from('proveedores')
    .insert({
      mail_contacto:        body.mail_contacto,
      razon_social:         body.razon_social,
      nombre_fantasia:      body.nombre_fantasia,
      domicilio:            body.domicilio,
      ciudad:               body.ciudad,
      pais:                 body.pais,
      telefono:             body.telefono,
      cuit:                 body.cuit,
      condicion_impositiva: body.condicion_impositiva,
      forma_pago:           body.forma_pago,
      moneda_pago:          body.moneda_pago,
      termino_pago:         body.termino_pago,
      datos_bancarios:      body.datos_bancarios,
      mail_pagos:           body.mail_pagos,
      contacto_admin:       body.contacto_admin,
      contacto_comercial:   body.contacto_comercial,
      contacto_reservas:    body.contacto_reservas,
      telefono_emergencias: body.telefono_emergencias,
    })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail a destinatarios configurados
  try {
    const { data: setting } = await supabase
      .from('app_settings').select('value').eq('key', 'alerta_destinatarios').single()
    const mails: string[] = setting?.value?.length ? setting.value : ['tarifas@sayhueque.com']
    await enviarMailNuevoProveedor(data, mails)
  } catch (e) { console.error('Mail nuevo proveedor error:', e) }

  // Auto-asignar
  try {
    await autoAssignProveedor(supabase, data.id)
  } catch (e) { console.error('Auto-assign proveedor error:', e) }

  return NextResponse.json({ ok: true, proveedor: data })
}

async function autoAssignProveedor(supabase: any, proveedorId: string) {
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'auto_assign_enabled').single()
  if (!setting?.value) return

  const { data: responsables } = await supabase
    .from('perfiles').select('id, nombre, mail')
    .eq('activo', true).eq('rol', 'responsable')
  if (!responsables?.length) return

  // Carga actual de proveedores abiertos
  const { data: abiertos } = await supabase
    .from('proveedores').select('responsable_id')
    .neq('estado', 'Cargado').not('responsable_id', 'is', null)

  const carga: Record<string, number> = {}
  for (const p of abiertos || []) {
    carga[p.responsable_id] = (carga[p.responsable_id] || 0) + 1
  }

  // Scoring simple por carga
  const scored = responsables
    .map((r: any) => ({ ...r, score: -Math.min((carga[r.id] || 0) * 5, 30) }))
    .sort((a: any, b: any) => b.score - a.score)

  const mejor = scored[0]

  await supabase.from('proveedores').update({
    responsable_id: mejor.id,
    estado: 'Asignado',
  }).eq('id', proveedorId)

  // Mail al responsable
  const { data: prov } = await supabase.from('proveedores').select('*').eq('id', proveedorId).single()
  if (prov && mejor.mail) {
    const transporter = createTransport({
      service: 'gmail',
      auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
    })
    await transporter.sendMail({
      from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
      to: mejor.mail,
      subject: `[Alta asignada] ${prov.razon_social}`,
      html: `<div style="font-family:Arial,sans-serif;font-size:13px;max-width:500px;">
        <div style="background:#1e3a5f;padding:16px 20px;border-radius:8px 8px 0 0;">
          <p style="margin:0;color:#93c5fd;font-size:11px;text-transform:uppercase">Say Hueque · Atlas Archive</p>
          <h2 style="margin:6px 0 0;color:white;font-size:16px;">📋 Alta de proveedor asignada</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px;">
          <p>Hola <strong>${esc(mejor.nombre)}</strong>, se te asignó el alta del siguiente proveedor:</p>
          <p><strong>Razón Social:</strong> ${esc(prov.razon_social)}</p>
          <p><strong>País:</strong> ${esc(prov.pais || '—')}</p>
          <p><strong>Mail:</strong> ${esc(prov.mail_contacto)}</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:16px">Say Hueque · Atlas Archive</p>
        </div>
      </div>`,
    })
  }
}
