import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildResumen } from '@/lib/types'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { mail_solicitante, area_afectada, descripcion,
            motivo_tarifas, motivo_bd, proveedor, ciudad,
            tipo_servicio, fechas_servicio, imagen_url } = body

    if (!mail_solicitante || !area_afectada || !descripcion) {
      return NextResponse.json({ error: 'Faltan campos obligatorios' }, { status: 400 })
    }

    const supabase = createClient()
    const resumen_servicio = buildResumen(proveedor, ciudad, tipo_servicio, fechas_servicio)

    const { data, error } = await supabase
      .from('tickets')
      .insert([{
        mail_solicitante, area_afectada, descripcion,
        motivo_tarifas: motivo_tarifas || null,
        motivo_bd: motivo_bd || null,
        proveedor: proveedor || null,
        ciudad: ciudad || null,
        tipo_servicio: tipo_servicio || null,
        fechas_servicio: fechas_servicio || null,
        imagen_url: imagen_url || null,
        resumen_servicio: resumen_servicio || null,
        estado: 'Recibido',
      }])
      .select().single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ticket: data }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Error interno' }, { status: 500 })
  }
}
