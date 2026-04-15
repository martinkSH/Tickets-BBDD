import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;') }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proyectos_tareas')
    .select('*, asignado:asignado_id(nombre,mail), subtareas:proyectos_subtareas(*), comentarios:proyectos_comentarios(*, autor:autor_id(nombre,mail))')
    .eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { prevAsignadoId, ...body } = await req.json()

  const { data: tarea, error } = await supabase
    .from('proyectos_tareas')
    .update(body)
    .eq('id', params.id)
    .select('*, asignado:asignado_id(nombre,mail), lista:lista_id(nombre), proyecto:proyecto_id(nombre)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail si cambió el asignado
  if (body.asignado_id && body.asignado_id !== prevAsignadoId && tarea.asignado?.mail) {
    try {
      const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: tarea.asignado.mail,
        subject: `[Proyecto] Tarea asignada: ${tarea.titulo}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase">Atlas Archive · Proyectos</p>
            <h2 style="margin:6px 0 0;color:white;font-size:18px">📋 Tarea asignada a vos</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
            <h3 style="margin:0 0 12px;font-size:15px;color:#111827">${esc(tarea.titulo)}</h3>
            ${tarea.descripcion ? `<p style="margin:0 0 12px;font-size:13px;color:#374151">${esc(tarea.descripcion)}</p>` : ''}
            <div style="font-size:12px;color:#6b7280;margin-bottom:16px">
              <div>📁 ${esc(tarea.proyecto?.nombre||'')} · 📂 ${esc(tarea.lista?.nombre||'')}</div>
              ${tarea.fecha_vencimiento ? `<div style="margin-top:4px">📅 Vence: ${tarea.fecha_vencimiento}</div>` : ''}
            </div>
            <a href="${APP_URL}/proyectos" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver en Atlas Archive →</a>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail tarea asignada patch:', e) }
  }

  return NextResponse.json({ ok: true, tarea })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('proyectos_tareas').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
