import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json()

  // Externo (tiene token)
  if (body.token) {
    const { data: externo } = await supabase.from('proyectos_externos')
      .select('nombre,mail').eq('token', body.token).eq('activo', true).single()
    if (!externo) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })
    const { data, error } = await supabase.from('proyectos_comentarios')
      .insert({ tarea_id: params.id, autor_mail: externo.mail, contenido: body.contenido })
      .select('*, autor:autor_id(nombre,mail)').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, comentario: { ...data, autor: { nombre: externo.nombre, mail: externo.mail } } })
  }

  // Interno (usuario logueado)
  const { data: { user } } = await supabase.auth.getUser()
  const { data: perfil } = await supabase.from('perfiles').select('mail').eq('id', user!.id).single()
  const { data, error } = await supabase.from('proyectos_comentarios')
    .insert({ tarea_id: params.id, autor_id: user?.id, autor_mail: perfil?.mail, contenido: body.contenido })
    .select('*, autor:autor_id(nombre,mail)').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, comentario: data })
}
