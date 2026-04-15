import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { token, ...fields } = body

  let creadorId: string | null = null

  if (token) {
    // Externo — validar token
    const { data: ext } = await supabase
      .from('proyectos_externos').select('id').eq('token', token).eq('activo', true).single()
    if (!ext) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    // creadorId queda null para externos
  } else {
    // Interno — obtener user de sesión
    const { data: { user } } = await supabase.auth.getUser()
    creadorId = user?.id || null
  }

  // Obtener orden máximo — usar mayfail en vez de single()
  const { data: maxRows } = await supabase
    .from('proyectos_tareas')
    .select('orden')
    .eq('lista_id', fields.lista_id)
    .order('orden', { ascending: false })
    .limit(1)
  const maxOrden = maxRows?.[0]?.orden ?? 0

  const { data: tarea, error } = await supabase
    .from('proyectos_tareas')
    .insert({ ...fields, creador_id: creadorId, orden: maxOrden + 1 })
    .select('*, asignado:asignado_id(nombre,mail), lista:lista_id(nombre), proyecto:proyecto_id(nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail al asignado si hay uno
  if (tarea.asignado?.mail) {
    try {
      const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: tarea.asignado.mail,
        subject: `[Proyecto] Nueva tarea asignada: ${tarea.titulo}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase">Atlas Archive · Proyectos</p>
            <h2 style="margin:6px 0 0;color:white;font-size:18px">📋 Nueva tarea asignada</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
            <h3 style="margin:0 0 8px">${esc(tarea.titulo)}</h3>
            <p style="font-size:12px;color:#6b7280">📁 ${esc(tarea.proyecto?.nombre||'')} · 📂 ${esc(tarea.lista?.nombre||'')}</p>
            <a href="${APP_URL}/proyectos" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600;margin-top:16px">Ver en Atlas Archive →</a>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail nueva tarea:', e) }
  }

  return NextResponse.json({ ok: true, tarea })
}
