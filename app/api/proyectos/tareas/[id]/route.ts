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
  const body = await req.json()
  const { prevAsignadoId, ...raw } = body

  // Campos permitidos en la tabla
  const CAMPOS_TABLA = ['titulo','descripcion','prioridad','estado','lista_id','asignado_id',
    'asignado_a','asignado_externo_id','asignado_externo_nombre','fecha_vencimiento','etiquetas']
  
  const updates: Record<string, any> = {}
  for (const k of CAMPOS_TABLA) {
    if (k in raw) updates[k] = raw[k] ?? null
  }

  // Si viene asignado_externo_id, limpiar asignado_id (es FK a perfiles, no puede ser externo)
  if (updates.asignado_externo_id) {
    updates.asignado_id = null
  }
  // Si viene asignado_id (interno), limpiar campos de externo
  if (updates.asignado_id) {
    updates.asignado_externo_id = null
    updates.asignado_externo_nombre = null
  }
  // Si se deselecciona todo
  if ('asignado_id' in updates && !updates.asignado_id && !updates.asignado_externo_id) {
    updates.asignado_externo_id = null
    updates.asignado_externo_nombre = null
    updates.asignado_a = null
  }

  const { data: tarea, error } = await supabase
    .from('proyectos_tareas')
    .update(updates)
    .eq('id', params.id)
    .select('*, asignado:asignado_id(nombre,mail), lista:lista_id(nombre), proyecto:proyecto_id(nombre)')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail al asignado
  const esNuevoAsignado = (updates.asignado_id && updates.asignado_id !== prevAsignadoId) || updates.asignado_externo_id
  const mailDestino = updates.asignado_externo_id ? updates.asignado_a : tarea.asignado?.mail
  const nombreDestino = updates.asignado_externo_nombre || tarea.asignado?.nombre || ''

  if (esNuevoAsignado && mailDestino) {
    try {
      const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: mailDestino,
        subject: `[Proyecto] Tarea asignada: ${tarea.titulo}`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase">Atlas Archive · Proyectos</p>
            <h2 style="margin:6px 0 0;color:white;font-size:18px">📋 Tarea asignada a vos</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
            <p>Hola <strong>${esc(nombreDestino)}</strong>, se te asignó una tarea:</p>
            <h3 style="margin:0 0 8px;font-size:15px;color:#111827">${esc(tarea.titulo)}</h3>
            ${tarea.descripcion ? `<p style="font-size:13px;color:#374151">${esc(tarea.descripcion)}</p>` : ''}
            <div style="font-size:12px;color:#6b7280">
              <div>📁 ${esc(tarea.proyecto?.nombre||'')} · 📂 ${esc(tarea.lista?.nombre||'')}</div>
              ${tarea.fecha_vencimiento ? `<div>📅 Vence: ${tarea.fecha_vencimiento}</div>` : ''}
            </div>
            <div style="margin-top:16px">
              <a href="${APP_URL}/proyectos" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver en Atlas Archive →</a>
            </div>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail tarea asignada:', e) }
  }

  return NextResponse.json({ ok: true, tarea })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('proyectos_tareas').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
