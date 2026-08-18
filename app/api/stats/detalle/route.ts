import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

// Detalle de una barra de estadísticas: los tickets que la componen + quién los concentra.
// Replica los filtros del RPC estadisticas_bbdd para que los totales coincidan con la barra.

const NULL_LABEL = '—'
const DIMS = ['area_negocio', 'area_afectada', 'motivo', 'tipo_ticket', 'proveedor'] as const
type Dim = (typeof DIMS)[number]

const COLS =
  'id,numero,created_at,fecha_resolucion,estado,mail_solicitante,responsable_nombre,' +
  'area_afectada,motivo_tarifas,motivo_bd,proveedor,ciudad,tipo_servicio,tipo_ticket,descripcion'

const norm = (s?: string | null) => (s || '').trim().toLowerCase()

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const sp = req.nextUrl.searchParams

  const dim = (sp.get('dim') || '') as Dim
  const label = sp.get('label') || ''
  const area = sp.get('area') || null           // filtro global: tab de área de negocio
  const proveedor = sp.get('proveedor') || null // filtro global: input de proveedor
  const fromStr = sp.get('from')
  const toStr = sp.get('to')

  if (!DIMS.includes(dim)) {
    return NextResponse.json({ error: 'dim inválida' }, { status: 400 })
  }

  const from = fromStr ? new Date(fromStr) : null
  const to = toStr ? new Date(toStr) : new Date()

  // "Tipos de resolución" se calcula sobre resueltos en el período, el resto sobre creados
  const sobreResueltos = dim === 'tipo_ticket'
  const fechaCol = sobreResueltos ? 'fecha_resolucion' : 'created_at'

  // Paginado explícito: el rango "Todo" supera el tope de filas por request de PostgREST
  const PAGE = 1000
  const rows: any[] = []
  for (let offset = 0; ; offset += PAGE) {
    let q = supabase
      .from('tickets_con_responsable')
      .select(COLS)
      .order(fechaCol, { ascending: false })
      .range(offset, offset + PAGE - 1)

    if (sobreResueltos) q = q.eq('estado', 'Resuelto')
    if (from) q = q.gte(fechaCol, from.toISOString())
    q = q.lte(fechaCol, to.toISOString())

    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    rows.push(...(data || []))
    if (!data || data.length < PAGE) break
  }

  // mail → área de negocio: mismo mapeo que la vista tickets_stats_base
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'solicitantes_areas').maybeSingle()
  const areaMap = new Map<string, string>()
  for (const x of ((setting?.value as any[]) || [])) {
    if (x?.mail) areaMap.set(norm(x.mail), String(x.area || '').toUpperCase())
  }
  // `??` y no `||`: replica el COALESCE del RPC, que sólo cubre NULL. Hay tickets con
  // motivo/area en string vacío y ésa es la label real de la barra que se clickeó.
  const areaDe = (t: any) => areaMap.get(norm(t.mail_solicitante)) ?? 'OTRO'
  const motivoDe = (t: any) => t.motivo_tarifas ?? t.motivo_bd ?? NULL_LABEL

  // Filtro de la dimensión clickeada. Se resuelve en JS porque `motivo` es un COALESCE
  // de dos columnas y `area_negocio` no existe como columna real.
  // Comparación exacta (sin lower/trim) porque el RPC agrupa por el valor crudo: así el
  // total del modal coincide siempre con el número de la barra.
  const valorDim = (t: any) => {
    switch (dim) {
      case 'area_negocio': return areaDe(t)
      case 'area_afectada': return t.area_afectada ?? NULL_LABEL
      case 'motivo': return motivoDe(t)
      case 'tipo_ticket': return t.tipo_ticket ?? NULL_LABEL
      case 'proveedor': return t.proveedor ?? ''
    }
  }

  const tickets = rows
    .filter(t =>
      (!area || areaDe(t) === area) &&
      // el filtro global de proveedor sí normaliza, igual que el RPC (lower(btrim(...)))
      (!proveedor || norm(t.proveedor) === norm(proveedor)) &&
      valorDim(t) === label
    )
    .map(t => ({ ...t, area_negocio: areaDe(t), motivo: motivoDe(t) }))

  const rank = (key: (t: any) => string) => {
    const m = new Map<string, { label: string; total: number; resueltos: number }>()
    for (const t of tickets) {
      const k = (key(t) || '').trim() || NULL_LABEL
      const e = m.get(k) || { label: k, total: 0, resueltos: 0 }
      e.total++
      if (t.estado === 'Resuelto') e.resueltos++
      m.set(k, e)
    }
    return Array.from(m.values()).sort((a, b) => b.total - a.total)
  }

  return NextResponse.json({
    dim,
    label,
    sobreResueltos,
    total: tickets.length,
    rankings: {
      solicitante: rank(t => t.mail_solicitante),
      responsable: rank(t => t.responsable_nombre || 'Sin asignar'),
      area_negocio: rank(t => t.area_negocio),
      proveedor: rank(t => t.proveedor),
    },
    tickets,
  })
}
