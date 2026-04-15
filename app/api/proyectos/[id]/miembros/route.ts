import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET — miembros internos del proyecto (para dropdowns de asignación)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('proyectos_miembros')
    .select('perfil:perfil_id(id,nombre,mail)')
    .eq('proyecto_id', params.id)
  if (error) return NextResponse.json([], { status: 200 })
  const perfiles = (data||[]).map((m: any) => m.perfil).filter(Boolean)
  return NextResponse.json(perfiles)
}

// POST — agregar miembro (para gestión desde settings del proyecto)
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { perfil_id, rol = 'miembro' } = await req.json()
  const { error } = await supabase
    .from('proyectos_miembros')
    .upsert({ proyecto_id: params.id, perfil_id, rol })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// DELETE — remover miembro
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { perfil_id } = await req.json()
  await supabase.from('proyectos_miembros')
    .delete().eq('proyecto_id', params.id).eq('perfil_id', perfil_id)
  return NextResponse.json({ ok: true })
}
