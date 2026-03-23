import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function businessHoursDiff(start: Date, end: Date): number {
  if (end <= start) return 0
  const workStart = 9, workEnd = 18
  let totalMs = 0
  const current = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const lastDay = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (current <= lastDay) {
    const dow = current.getDay()
    if (dow >= 1 && dow <= 5) {
      const ws = new Date(current.getFullYear(), current.getMonth(), current.getDate(), workStart, 0, 0)
      const we = new Date(current.getFullYear(), current.getMonth(), current.getDate(), workEnd, 0, 0)
      const iStart = new Date(Math.max(ws.getTime(), start.getTime()))
      const iEnd = new Date(Math.min(we.getTime(), end.getTime()))
      if (iEnd > iStart) totalMs += iEnd.getTime() - iStart.getTime()
    }
    current.setDate(current.getDate() + 1)
  }
  return totalMs / (1000 * 60 * 60)
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const area = req.nextUrl.searchParams.get('area') || ''

  // Cargar mapa mail→área
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'solicitantes_areas').single()
  const mailAreaMap: Record<string, string> = {}
  for (const s of (setting?.value || [])) {
    mailAreaMap[s.mail.toLowerCase()] = s.area.toUpperCase()
  }

  // Traer todos los tickets
  const allTickets: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('tickets_con_responsable').select('*')
      .range(from, from + 999).order('created_at', { ascending: true })
    if (!data || data.length === 0) break
    allTickets.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  // Filtrar tickets del área
  const ticketsArea = allTickets.filter(t => {
    const mailArea = mailAreaMap[(t.mail_solicitante || '').toLowerCase()]
    return mailArea === area.toUpperCase()
  })

  if (ticketsArea.length === 0) {
    return NextResponse.json({ total: 0, porSolicitante: [], rangos: [], porTipo: [], porEstado: {} })
  }

  // ── Stats ────────────────────────────────────────────────────────────────
  const porSolicitante: Record<string, {
    total: number; resueltos: number; abiertos: number
    rangos: number[]; sumaHoras: number; cantHoras: number; dias?: number[]
  }> = {}

  const rangosArea = [0, 0, 0, 0] // 07-10, 10-15, 15-18, 18+
  const rangoMatch = [
    (h: number) => h >= 6 && h < 9,
    (h: number) => h >= 9 && h < 16,
    (h: number) => h >= 16 && h < 18,
    (h: number) => h >= 18 || h < 6,
  ]
  const porTipo: Record<string, number> = {}
  const diasArea = [
    { label: 'Lunes',     total: 0 },
    { label: 'Martes',    total: 0 },
    { label: 'Miércoles', total: 0 },
    { label: 'Jueves',    total: 0 },
    { label: 'Viernes',   total: 0 },
    { label: 'Sábado',    total: 0 },
    { label: 'Domingo',   total: 0 },
  ]
  const porEstado: Record<string, number> = {}

  for (const t of ticketsArea) {
    const mail = t.mail_solicitante || 'SIN MAIL'
    const estado = t.estado as string
    const ts = new Date(t.created_at)
    const h = ts.getHours()
    const fechaSol = t.fecha_resolucion ? new Date(t.fecha_resolucion) : null
    const horas = estado === 'Resuelto' && fechaSol ? businessHoursDiff(ts, fechaSol) : null

    // Por solicitante
    if (!porSolicitante[mail]) porSolicitante[mail] = { total: 0, resueltos: 0, abiertos: 0, rangos: [0,0,0,0], sumaHoras: 0, cantHoras: 0 }
    porSolicitante[mail].total++
    if (estado === 'Resuelto') porSolicitante[mail].resueltos++
    else porSolicitante[mail].abiertos++
    if (horas !== null && horas >= 0) { porSolicitante[mail].sumaHoras += horas; porSolicitante[mail].cantHoras++ }

    // Rangos por solicitante y total área
    const ri = rangoMatch.findIndex(fn => fn(h))
    if (ri >= 0) { rangosArea[ri]++; porSolicitante[mail].rangos[ri]++ }

    // Por día
    const dow = ts.getDay()
    const diaIdx = dow === 0 ? 6 : dow - 1
    diasArea[diaIdx].total++
    if (!porSolicitante[mail].dias) porSolicitante[mail].dias = [0,0,0,0,0,0,0]
    porSolicitante[mail].dias![diaIdx]++

    // Por tipo
    if (estado === 'Resuelto' && t.tipo_ticket) {
      porTipo[t.tipo_ticket] = (porTipo[t.tipo_ticket] || 0) + 1
    }

    // Por estado
    porEstado[estado] = (porEstado[estado] || 0) + 1
  }

  const RANGOS_LABELS = ['06:00–08:59', '09:00–15:59', '16:00–17:59', '18:00–05:59']

  return NextResponse.json({
    total: ticketsArea.length,
    porEstado,
    porSolicitante: Object.entries(porSolicitante)
      .map(([mail, v]) => ({
        mail,
        ...v,
        promHoras: v.cantHoras > 0 ? v.sumaHoras / v.cantHoras : 0,
      }))
      .sort((a, b) => b.total - a.total),
    rangos: RANGOS_LABELS.map((label, i) => ({ label, total: rangosArea[i] })),
    dias: diasArea.map(d => ({ label: d.label, total: d.total })),
    porTipo: Object.entries(porTipo)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total),
  })
}
