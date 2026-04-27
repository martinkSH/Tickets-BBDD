import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'
function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { proyecto_id, nombre, mail, token_invitador } = await req.json()

  // Obtener datos del proyecto
  const { data: proyecto } = await supabase
    .from('proyectos')
    .select('nombre')
    .eq('id', proyecto_id).single()
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  // ¿Ya existe este mail en este proyecto?
  const { data: existe } = await supabase
    .from('proyectos_externos')
    .select('id, token, token_personal')
    .eq('proyecto_id', proyecto_id)
    .eq('mail', mail)
    .single()

  let externo: any = existe
  if (!externo) {
    // Buscar si ya tiene token_personal de otro proyecto
    const { data: otroToken } = await supabase
      .from('proyectos_externos')
      .select('token_personal')
      .eq('mail', mail)
      .eq('activo', true)
      .not('token_personal', 'is', null)
      .limit(1)
      .single()

    const tokenPersonal = otroToken?.token_personal || crypto.randomUUID()

    const { data: nuevo, error } = await supabase
      .from('proyectos_externos')
      .insert({ proyecto_id, nombre, mail, token_personal: tokenPersonal })
      .select().single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    externo = nuevo
  } else {
    // Reactivar si estaba inactivo
    await supabase.from('proyectos_externos').update({ activo: true }).eq('id', externo.id)
  }

  // Quien invita
  let invitadoPor = 'el equipo de Say Hueque'
  if (token_invitador) {
    const { data: invitador } = await supabase
      .from('proyectos_externos')
      .select('nombre')
      .eq('token', token_invitador)
      .single()
    if (invitador) invitadoPor = invitador.nombre
  } else {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: p } = await supabase.from('perfiles').select('nombre').eq('id', user.id).single()
      if (p) invitadoPor = p.nombre
    }
  }

  const linkPersonal = `${APP_URL}/ext/${externo.token_personal}`
  const linkProyecto = `${APP_URL}/p/${externo.token}`

  try {
    const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
    await transporter.sendMail({
      from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
      to: mail,
      subject: `${esc(invitadoPor)} te invitó al proyecto: ${esc(proyecto.nombre)}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Proyectos</p>
          <h2 style="margin:6px 0 0;color:white;font-size:18px">📋 Te invitaron a colaborar</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
          <p style="margin:0 0 12px">Hola <strong>${esc(nombre)}</strong>,</p>
          <p style="margin:0 0 16px"><strong>${esc(invitadoPor)}</strong> te invitó a colaborar en el proyecto <strong>${esc(proyecto.nombre)}</strong> de Say Hueque.</p>
          <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:20px">
            <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#374151">Tus links de acceso:</p>
            <div style="margin-bottom:10px">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase">🏠 Portal personal (todos tus proyectos)</p>
              <a href="${linkPersonal}" style="color:#4f6ef7;font-size:13px;word-break:break-all">${linkPersonal}</a>
            </div>
            <div>
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:600;text-transform:uppercase">📋 Acceso directo a ${esc(proyecto.nombre)}</p>
              <a href="${linkProyecto}" style="color:#4f6ef7;font-size:13px;word-break:break-all">${linkProyecto}</a>
            </div>
          </div>
          <div style="text-align:center;margin-bottom:16px">
            <a href="${linkPersonal}" style="display:inline-block;background:#4f6ef7;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600">Ir a mi portal →</a>
          </div>
          <p style="color:#9ca3af;font-size:12px;margin:0">Guardá el link del portal personal — desde ahí podés ver todos tus proyectos en un solo lugar.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:4px">Say Hueque · Atlas Archive</p>
        </div>
      </div>`,
    })
  } catch(e) { console.error('Mail externo:', e) }

  return NextResponse.json({ ok: true, externo, link: linkProyecto, linkPersonal })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const proyecto_id = req.nextUrl.searchParams.get('proyecto_id')
  if (!proyecto_id) return NextResponse.json([])
  const { data } = await supabase
    .from('proyectos_externos')
    .select('*')
    .eq('proyecto_id', proyecto_id)
    .eq('activo', true)
    .order('created_at')
  return NextResponse.json(data || [])
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { id } = await req.json()
  await supabase.from('proyectos_externos').update({ activo: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
