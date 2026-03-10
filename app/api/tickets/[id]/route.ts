import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailTicketAsignado } from '@/lib/mailer'
import type { Estado } from '@/lib/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

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
    } else if (comentario) {
      updates.comentario_asignacion = comentario
    }
  }

  const { error } = await supabase.from('tickets').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mandar mail al solicitante si se asigna responsable
  const nuevoEstado = updates.estado as string || estado
  if (responsable_id && (nuevoEstado === 'Asignado' || estado === 'Asignado')) {
    try {
      const { data: ticket } = await supabase
        .from('tickets_con_responsable')
        .select('*')
        .eq('id', params.id)
        .single()

      if (ticket) {
        await mailTicketAsignado({
          numero: ticket.numero,
          mail_solicitante: ticket.mail_solicitante,
          area_afectada: ticket.area_afectada,
          descripcion: ticket.descripcion,
          proveedor: ticket.proveedor,
          responsable_nombre: ticket.responsable_nombre,
          comentario: comentario,
        })
      }
    } catch (e) {
      console.error('Error enviando mail asignacion:', e)
    }
  }

  return NextResponse.json({ ok: true })
}
