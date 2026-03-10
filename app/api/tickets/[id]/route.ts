import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { Estado } from '@/lib/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const body = await req.json()
  const { responsable_id, estado, comentario, tipo_ticket } = body as {
    responsable_id?: string | null
    estado?: Estado
    comentario?: string
    tipo_ticket?: string
  }

  const updates: Record<string, unknown> = {}
  if (responsable_id !== undefined) {
    updates.responsable_id = responsable_id
    if (responsable_id && estado === undefined) updates.estado = 'Asignado'
  }
  if (estado) {
    updates.estado = estado
    if (estado === 'Resuelto') {
      updates.fecha_resolucion = new Date().toISOString()
      if (comentario) updates.comentario_solucion = comentario
      if (tipo_ticket) updates.tipo_ticket = tipo_ticket
    } else if (estado === 'Asignado' && comentario) {
      updates.comentario_asignacion = comentario
    } else if (comentario) {
      updates.comentario_asignacion = comentario
    }
  }

  const { error } = await supabase.from('tickets').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
