import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailNuevoTicket, mailTicketAsignadoResponsable, mailTicketAsignadoSolicitante } from '@/lib/mailer'

async function autoAssign(supabase: any, ticketId: string, ticket: any) {
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'auto_assign_enabled').single()
  if (!setting?.value) return

  const { data: responsables } = await supabase
    .from('perfiles').select('id, nombre, mail')
    .eq('activo', true).eq('rol', 'responsable')
  if (!responsables?.length) return

  const seisAtras = new Date()
  seisAtras.setMonth(seisAtras.getMonth() - 6)
  const { data: historial } = await supabase
    .from('tickets').select('responsable_id, mail_solicitante, proveedor')
    .gte('created_at', seisAtras.toISOString())
    .not('responsable_id', 'is', null)

  const { data: abiertos } = await supabase
    .from('tickets').select('responsable_id')
    .neq('estado', 'Resuelto').not('responsable_id', 'is', null)

  const cargaActual: Record<string, number> = {}
  for (const t of abiertos || []) {
    cargaActual[t.responsable_id] = (cargaActual[t.responsable_id] || 0) + 1
  }

  const scored = responsables.map((r: any) => {
    const hist = (historial || []).filter((h: any) => h.responsable_id === r.id)
    const pSol = Math.min(hist.filter((h: any) => h.mail_solicitante === ticket.mail_solicitante).length * 8, 40)
    const pProv = ticket.proveedor
      ? Math.min(hist.filter((h: any) => h.proveedor?.toLowerCase() === ticket.proveedor?.toLowerCase()).length * 10, 30)
      : 0
    const pCarga = -Math.min((cargaActual[r.id] || 0) * 5, 30)
    return { ...r, score: pSol + pProv + pCarga }
  }).sort((a: any, b: any) => b.score - a.score)

  const mejor = scored[0]

  await supabase.from('tickets').update({
    responsable_id: mejor.id,
    estado: 'Asignado',
    assigned_at: new Date().toISOString(),
  }).eq('id', ticketId)

  console.log(`[AUTO-ASSIGN] ${ticketId} → ${mejor.nombre} (score: ${mejor.score})`)

  // Obtener ticket actualizado para los mails
  const { data: ticketActualizado } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', ticketId).single()

  const comentario = `Asignado automáticamente por el sistema según historial y disponibilidad.`

  // Mail al responsable
  try {
    await mailTicketAsignadoResponsable({
      ...ticketActualizado,
      responsable_mail: mejor.mail,
      responsable_nombre: mejor.nombre,
      comentario,
    })
  } catch (e) { console.error('[AUTO-ASSIGN] Mail responsable error:', e) }

  // Mail al solicitante
  try {
    await mailTicketAsignadoSolicitante({
      ...ticketActualizado,
      responsable_nombre: mejor.nombre,
      comentario: undefined, // no mostrar comentario interno al solicitante
    })
  } catch (e) { console.error('[AUTO-ASSIGN] Mail solicitante error:', e) }
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()

  const { data: ticket, error } = await supabase
    .from('tickets')
    .insert({
      mail_solicitante: body.mail_solicitante,
      area_afectada: body.area_afectada,
      motivo_tarifas: body.motivo_tarifas,
      motivo_bd: body.motivo_bd,
      proveedor: body.proveedor,
      ciudad: body.ciudad,
      tipo_servicio: body.tipo_servicio,
      fechas_servicio: body.fechas_servicio,
      descripcion: body.descripcion,
      imagen_url: body.imagen_url,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail de nuevo ticket a tarifas
  try {
    const { data: settings } = await supabase
      .from('app_settings').select('value').eq('key', 'alerta_destinatarios').single()
    const destinatarios: string[] = settings?.value?.length
      ? settings.value : ['tarifas@sayhueque.com']
    await mailNuevoTicket(ticket, destinatarios)
  } catch (e) { console.error('Error mail nuevo ticket:', e) }

  // Auto-asignar (incluye mails al responsable y solicitante)
  try {
    await autoAssign(supabase, ticket.id, ticket)
  } catch (e) { console.error('Auto-assign error:', e) }

  return NextResponse.json({ ok: true, ticket })
}
