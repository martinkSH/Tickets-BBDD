import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function isBusinessTime(d: Date): boolean {
  const day = d.getDay()
  if (day === 0 || day === 6) return false
  const hour = d.getHours() + d.getMinutes() / 60
  return hour >= 9 && hour < 18
}

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

async function fetchAllTickets(supabase: any) {
  const PAGE = 1000
  let all: any[] = []
  let from = 0
  while (true) {
    const { data, error } = await supabase
      .from('tickets_con_responsable')
      .select('*')
      .range(from, from + PAGE - 1)
      .order('created_at', { ascending: true })
    if (error || !data || data.length === 0) break
    all = all.concat(data)
    if (data.length < PAGE) break
    from += PAGE
  }
  return all
}

export async function GET() {
  const supabase = createClient()
  const tickets = await fetchAllTickets(supabase)
  if (!tickets.length) return NextResponse.json({ error: 'No data' }, { status: 500 })

  const now = new Date()

  let totalHabil = 0, pendientes = 0, asignados = 0, resueltos = 0
  let sumaHorasGlobal = 0, cantHorasGlobal = 0
  const porResponsable: Record<string, { nombre: string; total: number; resueltos: number; sumaHoras: number; cantHoras: number }> = {}
  const porEmisor: Record<string, { total: number; resueltos: number; sumaHoras: number; cantHoras: number }> = {}
  const rangos = [
    { id: '06-09', label: '06:00–08:59', match: (h: number) => h >= 6 && h < 9,  total: 0 },
    { id: '09-16', label: '09:00–15:59', match: (h: number) => h >= 9 && h < 16, total: 0 },
    { id: '16-18', label: '16:00–17:59', match: (h: number) => h >= 16 && h < 18, total: 0 },
    { id: '18+',   label: '18:00–05:59', match: (h: number) => h >= 18 || h < 6,  total: 0 },
  ]
  const atrasados: { numero: string; responsable: string; estado: string; horas: number }[] = []
  const porTipoTicket: Record<string, number> = {}

  for (const t of tickets) {
    const ts = new Date(t.created_at)
    const estado = t.estado as string
    const mail = t.mail_solicitante || 'SIN MAIL'
    const respId = t.responsable_id || 'sin-asignar'
    const respNombre = t.responsable_nombre || 'Sin asignar'
    const fechaSol = t.fecha_resolucion ? new Date(t.fecha_resolucion) : null
    const horas = estado === 'Resuelto' && fechaSol ? businessHoursDiff(ts, fechaSol) : null

    if (isBusinessTime(ts)) {
      totalHabil++
      if (estado === 'Recibido') pendientes++
      if (estado === 'Asignado' || estado === 'Pendiente Operador' || estado === 'Pendiente Ventas') asignados++
      if (estado === 'Resuelto') resueltos++
      if (horas !== null && horas >= 0) { sumaHorasGlobal += horas; cantHorasGlobal++ }

      if (!porResponsable[respId]) porResponsable[respId] = { nombre: respNombre, total: 0, resueltos: 0, sumaHoras: 0, cantHoras: 0 }
      porResponsable[respId].total++
      if (estado === 'Resuelto' && horas !== null && horas >= 0) {
        porResponsable[respId].resueltos++; porResponsable[respId].sumaHoras += horas; porResponsable[respId].cantHoras++
      }

      if (!porEmisor[mail]) porEmisor[mail] = { total: 0, resueltos: 0, sumaHoras: 0, cantHoras: 0 }
      porEmisor[mail].total++
      if (estado === 'Resuelto' && horas !== null && horas >= 0) {
        porEmisor[mail].resueltos++; porEmisor[mail].sumaHoras += horas; porEmisor[mail].cantHoras++
      }
    }

    const h = ts.getHours()
    const rango = rangos.find(r => r.match(h))
    if (rango) rango.total++

    // Tipos de resolución
    if (estado === 'Resuelto' && t.tipo_ticket) {
      porTipoTicket[t.tipo_ticket] = (porTipoTicket[t.tipo_ticket] || 0) + 1
    }

    if (estado !== 'Resuelto') {
      const diff = businessHoursDiff(ts, now)
      if (diff > 24) atrasados.push({ numero: t.numero, responsable: respNombre, estado, horas: diff })
    }
  }

  const totalActual = tickets.length
  const recibidosAhora = tickets.filter(t => t.estado === 'Recibido').length
  const asignadosAhora = tickets.filter(t => ['Asignado','Pendiente Operador','Pendiente Ventas'].includes(t.estado)).length
  const resueltosAhora = tickets.filter(t => t.estado === 'Resuelto').length

  return NextResponse.json({
    resumen: { totalActual, recibidosAhora, asignadosAhora, resueltosAhora, totalHabil, promHoras: cantHorasGlobal > 0 ? sumaHorasGlobal / cantHorasGlobal : 0 },
    porResponsable: Object.values(porResponsable).sort((a, b) => b.total - a.total),
    porEmisor: Object.entries(porEmisor).map(([mail, v]) => ({ mail, ...v, prom: v.cantHoras > 0 ? v.sumaHoras / v.cantHoras : 0 })).sort((a, b) => b.total - a.total).slice(0, 10),
    rangos: rangos.map(r => ({ label: r.label, total: r.total })),
    atrasados: atrasados.sort((a, b) => b.horas - a.horas),
    porTipoTicket: Object.entries(porTipoTicket)
      .map(([tipo, total]) => ({ tipo, total }))
      .sort((a, b) => b.total - a.total),
  })
}
