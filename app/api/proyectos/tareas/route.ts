import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json()

  // Obtener orden máximo en la lista
  const { data: maxOrden } = await supabase
    .from('proyectos_tareas').select('orden').eq('lista_id', body.lista_id).order('orden', { ascending: false }).limit(1).single()

  const { data: tarea, error } = await supabase
    .from('proyectos_tareas')
    .insert({ ...body, creador_id: user?.id, orden: (maxOrden?.orden || 0) + 1 })
    .select('*, asignado:asignado_id(nombre,mail), lista:lista_id(nombre), proyecto:proyecto_id(nombre)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail al asignado
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
            <p>Hola <strong>${esc(tarea.asignado.nombre||'')}</strong>, se te asignó una nueva tarea:</p>
            <div style="background:#f9fafb;border-radius:8px;padding:16px;margin:12px 0">
              <h3 style="margin:0 0 8px;font-size:15px;color:#111827">${esc(tarea.titulo)}</h3>
              ${tarea.descripcion ? `<p style="margin:0 0 8px;font-size:13px;color:#374151">${esc(tarea.descripcion)}</p>` : ''}
              <div style="display:flex;gap:16px;margin-top:10px;font-size:12px;color:#6b7280">
                <span>📁 ${esc(tarea.proyecto?.nombre||'')}</span>
                <span>📂 ${esc(tarea.lista?.nombre||'')}</span>
                ${tarea.fecha_vencimiento ? `<span>📅 Vence: ${tarea.fecha_vencimiento}</span>` : ''}
                ${tarea.prioridad ? `<span>🔴 Prioridad: ${tarea.prioridad}</span>` : ''}
              </div>
            </div>
            <a href="${APP_URL}/proyectos" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver en Atlas Archive →</a>
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail tarea asignada:', e) }
  }

  return NextResponse.json({ ok: true, tarea })
}
