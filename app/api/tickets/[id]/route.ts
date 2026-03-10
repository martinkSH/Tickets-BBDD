import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

    const body = await req.json()
    const { action, ...payload } = body
    let update: Record<string, unknown> = {}

    switch (action) {
      case 'asignar':
        // Solo admin puede asignar
        update = {
          responsable_id: payload.responsable_id,
          estado: 'Asignado',
          comentario_asignacion: payload.comentario_asignacion || null,
        }
        break
      case 'resolver':
        // El responsable resuelve su propio ticket
        update = {
          estado: 'Resuelto',
          comentario_solucion: payload.comentario_solucion,
          tipo_ticket: payload.tipo_ticket || null,
        }
        break
      default:
        update = payload
    }

    const { data, error } = await supabase
      .from('tickets')
      .update(update)
      .eq('id', params.id)
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ticket: data })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
