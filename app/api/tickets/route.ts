import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailNuevoTicket } from '@/lib/mailer'

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

  // Mandar mail a tarifas@sayhueque.com
  try {
    await mailNuevoTicket(ticket)
  } catch (e) {
    console.error('Error enviando mail nuevo ticket:', e)
  }

  return NextResponse.json({ ok: true, ticket })
}
