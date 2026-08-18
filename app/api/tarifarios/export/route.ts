import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildXlsx, XLSX_CONTENT_TYPE, type XlsxCellInput, type XlsxStyle } from '@/lib/xlsx'

export const dynamic = 'force-dynamic'

// Índices de estilo (1-based, en el orden del array STYLES)
const STYLES: XlsxStyle[] = [
  { bold: true, color: 'FFFFFF', bg: '1E3A5F', align: 'center', valign: 'center', wrap: true, border: true, size: 11 }, // 1 header
  { border: true, valign: 'top', wrap: true },                                                    // 2 texto
  { border: true, valign: 'top', bold: true },                                                    // 3 proveedor
  { border: true, valign: 'top', align: 'center' },                                               // 4 centrado
  { border: true, valign: 'top', align: 'center', fmt: 'dd/mm/yyyy hh:mm' },                      // 5 fecha
  { border: true, valign: 'top', align: 'center', fmt: '0' },                                     // 6 número
  { border: true, valign: 'top', color: '2563EB', underline: true },                              // 7 link
  { border: true, valign: 'top', align: 'center', bg: 'F1F5F9', color: '475569' },                // 8 Pendiente
  { border: true, valign: 'top', align: 'center', bg: 'FEF3C7', color: 'B45309' },                // 9 En Proceso
  { border: true, valign: 'top', align: 'center', bg: 'D1FAE5', color: '065F46' },                // 10 Cargado
  { border: true, valign: 'top', align: 'center', bg: 'FEE2E2', color: 'B91C1C' },                // 11 No Cargar
  { border: true, valign: 'top', align: 'center', bg: '7F1D1D', color: 'FFFFFF', bold: true },    // 12 L. de Alojamiento
  { border: true, valign: 'top', align: 'center', bg: 'FEE2E2', color: 'B91C1C', bold: true },    // 13 ALTA
  { border: true, valign: 'top', align: 'center', bg: 'FEF3C7', color: 'B45309' },                // 14 MEDIA
  { border: true, valign: 'top', align: 'center', bg: 'DCFCE7', color: '15803D' },                // 15 BAJA
  { bold: true, size: 12, color: '1E3A5F' },                                                      // 16 título resumen
  { bold: true, color: '6B7280', size: 10 },                                                      // 17 subtítulo resumen
  { border: true, bold: true, bg: 'F9FAFB' },                                                     // 18 label resumen
  { border: true, align: 'center', fmt: '0' },                                                    // 19 valor resumen
]

const S_HEADER = 1, S_TXT = 2, S_PROV = 3, S_CENTER = 4, S_DATE = 5, S_NUM = 6, S_LINK = 7
const S_TITULO = 16, S_SUB = 17, S_LABEL = 18, S_VALOR = 19

const ESTADO_STYLE: Record<string, number> = {
  'Pendiente': 8, 'En Proceso': 9, 'Cargado': 10, 'No Cargar': 11,
}
const PRIO_STYLE: Record<string, number> = {
  'L. de Alojamiento': 12, 'ALTA': 13, 'MEDIA': 14, 'BAJA': 15,
}

const COLUMNS = [
  { header: 'Proveedor',        width: 34 },
  { header: 'Destino',          width: 14 },
  { header: 'País',             width: 8  },
  { header: 'Prioridad',        width: 17 },
  { header: 'Estado',           width: 13 },
  { header: 'Responsable',      width: 18 },
  { header: 'Fecha ingreso',    width: 17 },
  { header: 'Fecha asignación', width: 17 },
  { header: 'Fecha carga',      width: 17 },
  { header: 'Días abierto',     width: 12 },
  { header: 'Nota rápida',      width: 38 },
  { header: 'Notas de carga',   width: 46 },
  { header: 'Link tarifario',   width: 22 },
  { header: 'Mail enviado',     width: 17 },
]

function toDate(iso?: string | null): Date | null {
  if (!iso) return null
  const d = new Date(iso)
  return isNaN(d.getTime()) ? null : d
}

function sanitizeLink(url?: string | null): string | null {
  if (!url) return null
  const u = url.trim()
  if (!u) return null
  if (u.startsWith('http://') || u.startsWith('https://')) return u
  if (/^[\w.-]+\.[a-z]{2,}/i.test(u)) return 'https://' + u
  return null
}

// Días entre el ingreso y la carga (o hasta hoy si sigue abierto)
function diasAbierto(t: any): number | null {
  const desde = toDate(t.fecha_ingreso) || toDate(t.created_at)
  if (!desde) return null
  const hasta = toDate(t.fecha_carga) || new Date()
  return Math.max(0, Math.round((hasta.getTime() - desde.getTime()) / 86400000))
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const sp = req.nextUrl.searchParams
  const f = {
    estado: sp.get('estado') || undefined,
    prioridad: sp.get('prioridad') || undefined,
    pais: sp.get('pais') || undefined,
    q: sp.get('q') || undefined,
  }

  // Trae todo lo que matchea los filtros (Supabase corta en 1000 por request)
  const BATCH = 1000
  const tarifarios: any[] = []
  for (let from = 0; ; from += BATCH) {
    let query = supabase.from('tarifarios').select('*').order('created_at', { ascending: false })
    if (f.estado)    query = query.eq('estado', f.estado)
    if (f.prioridad) query = query.eq('prioridad', f.prioridad)
    if (f.pais)      query = query.eq('pais', f.pais)
    if (f.q)         query = query.ilike('proveedor', `%${f.q}%`)

    const { data, error } = await query.range(from, from + BATCH - 1)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    tarifarios.push(...(data || []))
    if (!data || data.length < BATCH) break
  }

  // ── Hoja 1: detalle ───────────────────────────────────────────────────────
  const rows: XlsxCellInput[][] = [
    COLUMNS.map(c => ({ v: c.header, s: S_HEADER })),
  ]

  for (const t of tarifarios) {
    const link = sanitizeLink(t.link)
    const dias = diasAbierto(t)
    rows.push([
      { v: t.proveedor || '', s: S_PROV },
      { v: t.destino || '', s: S_TXT },
      { v: t.pais || '', s: S_CENTER },
      { v: t.prioridad || '', s: PRIO_STYLE[t.prioridad] || S_CENTER },
      { v: t.estado || '', s: ESTADO_STYLE[t.estado] || S_CENTER },
      { v: t.cargo_por || 'Sin asignar', s: S_TXT },
      { v: toDate(t.fecha_ingreso) || toDate(t.created_at), s: S_DATE },
      { v: toDate(t.fecha_asignacion), s: S_DATE },
      { v: toDate(t.fecha_carga), s: S_DATE },
      { v: dias, s: S_NUM },
      { v: t.nota_rapida || '', s: S_TXT },
      { v: t.nota_larga || '', s: S_TXT },
      link ? { v: 'Ver tarifario', s: S_LINK, href: link } : { v: '', s: S_TXT },
      { v: toDate(t.fecha_envio), s: S_DATE },
    ])
  }

  // ── Hoja 2: resumen ───────────────────────────────────────────────────────
  const contar = (campo: string) => {
    const m = new Map<string, number>()
    for (const t of tarifarios) m.set(t[campo] || '(sin dato)', (m.get(t[campo] || '(sin dato)') || 0) + 1)
    return Array.from(m.entries()).sort((a, b) => b[1] - a[1])
  }

  const filtrosTxt = [
    f.estado && `Estado: ${f.estado}`,
    f.prioridad && `Prioridad: ${f.prioridad}`,
    f.pais && `País: ${f.pais}`,
    f.q && `Búsqueda: "${f.q}"`,
  ].filter(Boolean).join(' · ') || 'Sin filtros (todos los tarifarios)'

  const abiertos = tarifarios.filter(t => t.estado !== 'Cargado' && t.estado !== 'No Cargar')
  const diasAbiertos = abiertos.map(diasAbierto).filter((d): d is number => d !== null)
  const promDias = diasAbiertos.length
    ? Math.round(diasAbiertos.reduce((a, b) => a + b, 0) / diasAbiertos.length)
    : 0

  const resumen: XlsxCellInput[][] = [
    [{ v: 'Carga de Tarifarios — Resumen', s: S_TITULO }],
    [{ v: filtrosTxt, s: S_SUB }],
    [{ v: `Generado el ${new Date().toLocaleString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}`, s: S_SUB }],
    [],
    [{ v: 'TOTALES', s: S_LABEL }, { v: '', s: S_LABEL }],
    [{ v: 'Tarifarios exportados', s: S_LABEL }, { v: tarifarios.length, s: S_VALOR }],
    [{ v: 'Pendientes de carga', s: S_LABEL }, { v: abiertos.length, s: S_VALOR }],
    [{ v: 'Días promedio abiertos', s: S_LABEL }, { v: promDias, s: S_VALOR }],
    [],
    [{ v: 'POR ESTADO', s: S_LABEL }, { v: 'Cantidad', s: S_LABEL }],
    ...contar('estado').map(([k, n]): XlsxCellInput[] => [{ v: k, s: S_LABEL }, { v: n, s: S_VALOR }]),
    [],
    [{ v: 'POR PRIORIDAD', s: S_LABEL }, { v: 'Cantidad', s: S_LABEL }],
    ...contar('prioridad').map(([k, n]): XlsxCellInput[] => [{ v: k, s: S_LABEL }, { v: n, s: S_VALOR }]),
    [],
    [{ v: 'POR PAÍS', s: S_LABEL }, { v: 'Cantidad', s: S_LABEL }],
    ...contar('pais').map(([k, n]): XlsxCellInput[] => [{ v: k, s: S_LABEL }, { v: n, s: S_VALOR }]),
    [],
    [{ v: 'POR RESPONSABLE', s: S_LABEL }, { v: 'Cantidad', s: S_LABEL }],
    ...contar('cargo_por').map(([k, n]): XlsxCellInput[] => [{ v: k, s: S_LABEL }, { v: n, s: S_VALOR }]),
  ]

  const xlsx = buildXlsx([
    { name: 'Tarifarios', rows, cols: COLUMNS.map(c => c.width), freezeRows: 1, autoFilter: true },
    { name: 'Resumen', rows: resumen, cols: [32, 14] },
  ], STYLES)

  const sufijo = [f.estado, f.prioridad, f.pais].filter(Boolean).join('_').replace(/[^\w]+/g, '-')
  const nombre = `tarifarios${sufijo ? '_' + sufijo : ''}_${new Date().toISOString().slice(0, 10)}.xlsx`

  return new NextResponse(Buffer.from(xlsx), {
    headers: {
      'Content-Type': XLSX_CONTENT_TYPE,
      'Content-Disposition': `attachment; filename="${nombre}"`,
      'Cache-Control': 'no-store',
    },
  })
}
