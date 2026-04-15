import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { proyecto_id, nombre, mail } = await req.json()

  // Obtener token del proyecto
  const { data: proyecto } = await supabase.from('proyectos').select('nombre, token_compartir').eq('id', proyecto_id).single()
  if (!proyecto) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })

  // Crear colaborador externo
  const { data: externo, error } = await supabase.from('proyectos_externos')
    .insert({ proyecto_id, nombre, mail })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const link = `${APP_URL}/p/${externo.token}`

  // Enviar mail de invitación
  try {
    const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
    await transporter.sendMail({
      from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
      to: mail,
      subject: `Invitación al proyecto: ${proyecto.nombre}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px">
        <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
          <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Proyectos</p>
          <h2 style="margin:6px 0 0;color:white;font-size:18px">📋 Te invitaron a un proyecto</h2>
        </div>
        <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
          <p>Hola <strong>${nombre}</strong>,</p>
          <p>Fuiste invitado/a a colaborar en el proyecto <strong>${proyecto.nombre}</strong> de Say Hueque.</p>
          <p>Con este link podés acceder y trabajar en las tareas que te sean asignadas:</p>
          <div style="text-align:center;margin:24px 0">
            <a href="${link}" style="display:inline-block;background:#4f6ef7;color:white;padding:12px 28px;border-radius:10px;text-decoration:none;font-size:15px;font-weight:600">
              Acceder al proyecto →
            </a>
          </div>
          <p style="color:#9ca3af;font-size:12px">Este link es personal y exclusivo para vos. Guardalo para acceder cuando quieras.</p>
          <p style="color:#9ca3af;font-size:12px;margin-top:4px">Say Hueque · Atlas Archive</p>
        </div>
      </div>`,
    })
  } catch(e) { console.error('Mail externo:', e) }

  return NextResponse.json({ ok: true, externo, link })
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const proyecto_id = req.nextUrl.searchParams.get('proyecto_id')
  if (!proyecto_id) return NextResponse.json([])
  const { data } = await supabase.from('proyectos_externos').select('*').eq('proyecto_id', proyecto_id).order('created_at')
  return NextResponse.json(data || [])
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { id } = await req.json()
  await supabase.from('proyectos_externos').update({ activo: false }).eq('id', id)
  return NextResponse.json({ ok: true })
}
