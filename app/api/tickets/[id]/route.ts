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

  // La solución se guarda venga o no acompañada de un cambio de estado: el
  // modal deja corregirla mientras el ticket espera la conformidad.
  const sol = comentario_solucion ?? comentario
  if (sol) updates.comentario_solucion = sol
  if (tipo_ticket) updates.tipo_ticket = tipo_ticket

  if (estado) {
    updates.estado = estado
    const estadoPrevio = ticketActual?.estado

    if (estado === 'Resuelto') {
      if (estadoPrevio === 'Resuelto') {
        // Ya cerrado: cualquier otro guardado (corregir el tipo, cambiar
        // responsable) lo deja cerrado. No se reabre ni se remanda nada.
        updates.estado = 'Resuelto'
      } else {
        // BBDD ya no cierra el ticket: lo deja esperando la conformidad del
        // solicitante. fecha_resolucion sí se marca ahora — el trabajo de BBDD
        // terminó acá y es lo que miden las estadísticas.
        updates.estado = 'Pendiente Conformidad'
        // Si ya venía esperando conformidad, esto es una corrección de la
        // solución, no una resolución nueva: ni se pisa fecha_resolucion
        // (movería el promedio) ni se reinicia el reloj de las 72 hs.
        if (estadoPrevio !== 'Pendiente Conformidad') {
          const ahora = new Date().toISOString()
          updates.fecha_resolucion = ahora
          updates.conformidad_pedida_at = ahora
          updates.recordatorio_enviado_at = null
        }
      }
    } else if (ticketActual?.fecha_resolucion) {
      // Vuelve a un estado abierto: es una reapertura. Se limpia todo el rastro
      // de resolución o el ticket seguiría contando como resuelto y fuera del
      // backlog. Mismo criterio que la reapertura desde el mail del solicitante.
      updates.fecha_resolucion = null
      updates.conformidad_pedida_at = null
      updates.recordatorio_enviado_at = null
      updates.fecha_cierre = null
      updates.cerrado_por = null
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

    // Mail resolución: pide conformidad al solicitante y arranca el reloj.
    // Sólo en la transición — si el ticket ya venía esperando conformidad,
    // cualquier otro guardado (cambiar responsable, corregir el tipo) le
    // volvería a mandar el mismo mail al solicitante.
    if (nuevoEstado === 'Pendiente Conformidad'
        && ticketActual?.estado !== 'Pendiente Conformidad') {
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
