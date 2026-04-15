import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proyectos')
    .select(`*, espacio:espacio_id(id,nombre,color,icono), creador:creador_id(nombre), miembros:proyectos_miembros(perfil_id, perfil:perfil_id(nombre,mail))`)
    .order('created_at', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const body = await req.json()
  const { participantes, ...campos } = body
  
  const { data: proyecto, error } = await supabase
    .from('proyectos')
    .insert({ ...campos, creador_id: user?.id })
    .select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Crear listas por defecto
  await supabase.from('proyectos_listas').insert([
    { proyecto_id: proyecto.id, nombre: 'Por hacer',   color: '#6b7280', orden: 0 },
    { proyecto_id: proyecto.id, nombre: 'En progreso', color: '#2563eb', orden: 1 },
    { proyecto_id: proyecto.id, nombre: 'Revisión',    color: '#d97706', orden: 2 },
    { proyecto_id: proyecto.id, nombre: 'Completado',  color: '#16a34a', orden: 3 },
  ])

  // Agregar creador siempre como admin
  const miembrosAInsertar: any[] = []
  if (user?.id) miembrosAInsertar.push({ proyecto_id: proyecto.id, perfil_id: user.id, rol: 'admin' })

  // Agregar participantes seleccionados (evitar duplicar al creador)
  if (participantes?.length) {
    for (const pid of participantes) {
      if (pid !== user?.id) {
        miembrosAInsertar.push({ proyecto_id: proyecto.id, perfil_id: pid, rol: 'miembro' })
      }
    }
  }
  if (miembrosAInsertar.length) {
    await supabase.from('proyectos_miembros').insert(miembrosAInsertar)
  }

  return NextResponse.json({ ok: true, proyecto })
}
