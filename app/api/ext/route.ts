import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET todos los proyectos de un colaborador externo por su token personal
export async function GET(req: NextRequest) {
  const supabase = createClient()
  const token = req.nextUrl.searchParams.get('token')
  if (!token) return NextResponse.json({ error: 'Token requerido' }, { status: 401 })

  // Buscar el colaborador por token personal (puede estar en múltiples proyectos)
  // El mail del colaborador puede tener múltiples registros en proyectos_externos
  const { data: colaboradorBase } = await supabase
    .from('proyectos_externos')
    .select('mail, nombre')
    .eq('token_personal', token)
    .eq('activo', true)
    .single()

  if (!colaboradorBase) return NextResponse.json({ error: 'Link inválido o expirado' }, { status: 403 })

  // Traer todos los proyectos activos donde participa (mismo mail)
  const { data: participaciones } = await supabase
    .from('proyectos_externos')
    .select('id, token, token_personal, proyecto_id, activo')
    .eq('mail', colaboradorBase.mail)
    .eq('activo', true)

  if (!participaciones?.length) return NextResponse.json({ colaborador: colaboradorBase, proyectos: [] })

  const proyectoIds = participaciones.map((p: any) => p.proyecto_id)
  const tokenPorProyecto: Record<string, string> = {}
  participaciones.forEach((p: any) => { tokenPorProyecto[p.proyecto_id] = p.token })

  const { data: proyectos } = await supabase
    .from('proyectos')
    .select('id, nombre, descripcion, color, estado, fecha_inicio, fecha_fin, espacio:espacio_id(nombre,color,icono), listas:proyectos_listas(nombre, tareas:proyectos_tareas(id,asignado_a,asignado_externo_id))')
    .in('id', proyectoIds)
    .neq('estado', 'completado')
    .neq('estado', 'archivado')
    .order('created_at', { ascending: false })

  // Calcular métricas por proyecto
  const proyectosConMeta = (proyectos || []).map((p: any) => {
    const todasTareas = (p.listas || []).flatMap((l: any) => l.tareas || [])
    const misTareas = todasTareas.filter((t: any) =>
      t.asignado_a === colaboradorBase.mail ||
      participaciones.find((part: any) => part.proyecto_id === p.id && t.asignado_externo_id === part.id)
    )
    return {
      ...p,
      listas: undefined,
      totalTareas: todasTareas.length,
      misTareas: misTareas.length,
      token: tokenPorProyecto[p.id],
    }
  })

  return NextResponse.json({ colaborador: colaboradorBase, proyectos: proyectosConMeta })
}
