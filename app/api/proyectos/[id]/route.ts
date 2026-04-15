import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select(`*, espacio:espacio_id(id,nombre,color,icono), listas:proyectos_listas(*, tareas:proyectos_tareas(*, asignado:asignado_id(nombre,mail), subtareas:proyectos_subtareas(*), comentarios:proyectos_comentarios(count))), miembros:proyectos_miembros(perfil_id, rol, perfil:perfil_id(nombre,mail))`)
    .eq('id', params.id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // Ordenar listas y tareas
  if (data.listas) {
    data.listas.sort((a: any, b: any) => a.orden - b.orden)
    data.listas.forEach((l: any) => { if (l.tareas) l.tareas.sort((a: any, b: any) => a.orden - b.orden) })
  }
  return NextResponse.json(data)
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json()
  const { data, error } = await supabase.from('proyectos').update(body).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, proyecto: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('proyectos').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
