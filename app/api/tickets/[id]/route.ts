import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailTicketAsignadoResponsable, mailTicketAsignadoSolicitante, mailTicketResuelto } from '@/lib/mailer'
import type { Estado } from '@/lib/types'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

  const body = await req.json()
  const {
    responsable_id,
    estado,
    comentario_asignacion,
    comentario_solucion,
    tipo_ticket,
    // compatibilidad con campo legacy
    comentario,
  } = body as {
    responsable_id?: string | null
    estado?: string
    comentario_asignacion?: string
    comentario_solucion?: string
    tipo_ticket?: string
    comentario?: string
  }

  const { data: ticketActual } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', params.id).single()

  const updates: Record<string, unknown> = {}

  if (responsable_id !== undefined) {
    updates.responsable_id = responsable_id
    if (responsable_id && !estado) updates.estado = 'Asignado'
  }

  if (comentario_asignacion !== undefined) {
    updates.comentario_asignacion = comentario_asignacion
  }

  if (estado) {
    updates.estado = estado
    if (estado === 'Resuelto') {
      updates.fecha_resolucion = new Date().toISOString()
      const sol = comentario_solucion ?? comentario
      if (sol) updates.comentario_solucion = sol
      if (tipo_ticket) updates.tipo_ticket = tipo_ticket
    }
  }

  const { error } = await supabase.from('tickets').update(updates).eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: ticket } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', params.id).single()

  if (ticket) {
    const nuevoEstado = (updates.estado as string) || estado
    const respId = responsable_id ?? ticketActual?.responsable_id

    // Mail asignación
    if (responsable_id && nuevoEstado === 'Asignado') {
      const { data: resp } = await supabase
        .from('perfiles').select('mail, nombre').eq('id', responsable_id).single()
      if (resp) {
        try { await mailTicketAsignadoResponsable({ ...ticket, responsable_mail: resp.mail, responsable_nombre: resp.nombre, comentario: comentario_asignacion }) } catch (e) { console.error(e) }
        try { await mailTicketAsignadoSolicitante({ ...ticket, responsable_nombre: resp.nombre, comentario: comentario_asignacion }) } catch (e) { console.error(e) }
      }
    }

    // Mail resolución
    if (nuevoEstado === 'Resuelto') {
      try {
        await mailTicketResuelto({
          ...ticket,
          responsable_nombre: ticket.responsable_nombre || 'El equipo',
          comentario_solucion: comentario_solucion ?? comentario,
          tipo_ticket,
        })
      } catch (e) { console.error(e) }
    }
  }

  return NextResponse.json({ ok: true })
}
