import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('mail').eq('id', user!.id).single()
  const body = await req.json()
  const { data, error } = await supabase
    .from('proyectos_comentarios')
    .insert({ tarea_id: params.id, autor_id: user?.id, autor_mail: perfil?.mail, contenido: body.contenido })
    .select('*, autor:autor_id(nombre,mail)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, comentario: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { id: comentarioId } = await req.json()
  const { error } = await supabase.from('proyectos_comentarios').delete().eq('id', comentarioId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
