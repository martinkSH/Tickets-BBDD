import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Granularidad automática de la tendencia según el largo del rango
function autoBucket(fromMs: number | null, toMs: number): 'day' | 'week' | 'month' {
  if (fromMs === null) return 'month'
  const days = (toMs - fromMs) / 86_400_000
  if (days <= 45) return 'day'
  if (days <= 200) return 'week'
  return 'month'
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const sp = req.nextUrl.searchParams

  const sector = (sp.get('sector') || 'bbdd').toLowerCase()
  const area = sp.get('area') || null          // solo BBDD; null = general
  const proveedor = sp.get('proveedor') || null // solo BBDD; null = todos
  const sla = Number(sp.get('sla') || 24)
  const fromStr = sp.get('from')               // ISO o null (todo)
  const toStr = sp.get('to')                   // ISO o null (ahora)

  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : new Date()
  const fromMs = from ? from.getTime() : null
  const bucket = autoBucket(fromMs, to.getTime())

  // Período anterior de igual longitud (para comparación ▲▼)
  let prevFrom: Date | null = null
  let prevTo: Date | null = null
  if (from) {
    const len = to.getTime() - from.getTime()
    prevTo = new Date(from.getTime())
    prevFrom = new Date(from.getTime() - len)
  }

  const rpc = sector === 'it' ? 'estadisticas_it' : 'estadisticas_bbdd'
  const baseArgs =
    sector === 'it'
      ? { p_bucket: bucket, p_sla: sla }
      : { p_bucket: bucket, p_sla: sla, p_area: area, p_proveedor: proveedor }

  const call = (f: Date | null, t: Date | null) =>
    supabase.rpc(rpc, {
      p_from: f ? f.toISOString() : null,
      p_to: t ? t.toISOString() : null,
      ...baseArgs,
    })

  const [{ data: actual, error }, prev] = await Promise.all([
    call(from, to),
    prevFrom ? call(prevFrom, prevTo) : Promise.resolve({ data: null }),
  ])

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    actual,
    comparacion: (prev as any)?.data?.resumen ?? null,
    meta: {
      sector,
      area,
      proveedor,
      sla,
      bucket,
      from: from ? from.toISOString() : null,
      to: to.toISOString(),
    },
  })
}
