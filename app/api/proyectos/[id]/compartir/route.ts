import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 401 })

  // Validar que el token pertenece a este proyecto
  const { data: externo } = await supabase.from('proyectos_externos')
    .select('*').eq('token', token).eq('proyecto_id', params.id).eq('activo', true).single()
  if (!externo) return NextResponse.json({ error: 'Token inválido' }, { status: 403 })

  // Devolver el proyecto completo
  const { data } = await supabase.from('proyectos')
    .select('*, espacio:espacio_id(nombre,color,icono), listas:proyectos_listas(*, tareas:proyectos_tareas(*, asignado:asignado_id(nombre,mail), subtareas:proyectos_subtareas(*), comentarios:proyectos_comentarios(count)))')
    .eq('id', params.id).single()
  if (!data) return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 })
  if (data.listas) {
    data.listas.sort((a: any, b: any) => a.orden - b.orden)
    data.listas.forEach((l: any) => { if (l.tareas) l.tareas.sort((a: any, b: any) => a.orden - b.orden) })
  }
  return NextResponse.json({ proyecto: data, colaborador: externo })
}
