import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailTicketAsignadoResponsable, mailTicketAsignadoSolicitante, mailTicketResuelto } from '@/lib/mailer'
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

  // Obtener ticket actual antes de actualizar
  const { data: ticketActual } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', params.id).single()

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

  // Obtener ticket actualizado
  const { data: ticket } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', params.id).single()

  if (ticket) {
    const nuevoEstado = (updates.estado as string) || estado

    // Asignación: mail al responsable + mail al solicitante
    if (responsable_id && nuevoEstado === 'Asignado') {
      const { data: resp } = await supabase
        .from('perfiles').select('mail, nombre').eq('id', responsable_id).single()

      if (resp) {
        try {
          await mailTicketAsignadoResponsable({
            ...ticket,
            responsable_mail: resp.mail,
            responsable_nombre: resp.nombre,
            comentario,
          })
        } catch (e) { console.error('Mail responsable error:', e) }

        try {
          await mailTicketAsignadoSolicitante({
            ...ticket,
            responsable_nombre: resp.nombre,
            comentario,
          })
        } catch (e) { console.error('Mail solicitante error:', e) }
      }
    }

    // Resuelto: mail al solicitante
    if (nuevoEstado === 'Resuelto') {
      try {
        await mailTicketResuelto({
          ...ticket,
          responsable_nombre: ticket.responsable_nombre || 'El equipo',
          comentario_solucion: comentario,
          tipo_ticket,
        })
      } catch (e) { console.error('Mail resuelto error:', e) }
    }
  }

  return NextResponse.json({ ok: true })
}
