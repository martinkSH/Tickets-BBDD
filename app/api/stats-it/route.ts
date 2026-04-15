import { NextResponse } from 'next/server'
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
      const ws = new Date(current.getFullYear(), current.getMonth(), current.getDate(), workStart)
      const we = new Date(current.getFullYear(), current.getMonth(), current.getDate(), workEnd)
      const iStart = new Date(Math.max(ws.getTime(), start.getTime()))
      const iEnd   = new Date(Math.min(we.getTime(), end.getTime()))
      if (iEnd > iStart) totalMs += iEnd.getTime() - iStart.getTime()
    }
    current.setDate(current.getDate() + 1)
  }
  return totalMs / (1000 * 60 * 60)
}

const SISTEMAS = ['Tourplan','Pythagoras/Bazar','Backend B2C','Vamoos','Otro']
const RANGOS_LABELS = ['06:00–08:59','09:00–15:59','16:00–17:59','18:00–05:59']
const rangoMatch = [
  (h: number) => h >= 6 && h < 9,
  (h: number) => h >= 9 && h < 16,
  (h: number) => h >= 16 && h < 18,
  (h: number) => h >= 18 || h < 6,
]
const DIAS_LABELS = ['Lunes','Martes','Miércoles','Jueves','Viernes','Sábado','Domingo']

export async function GET() {
  const supabase = createClient()
  const now = new Date()

  // Traer todos los tickets IT
  const all: any[] = []
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('tickets_it')
      .select('*, responsable:responsable_id(id,nombre,mail)')
      .range(from, from + 999)
      .order('created_at', { ascending: true })
    if (!data || data.length === 0) break
    all.push(...data)
    if (data.length < 1000) break
    from += 1000
  }

  // Conteos globales
  const totalActual = all.length
  const recibidosAhora = all.filter(t => t.estado === 'Recibido').length
  const asignadosAhora = all.filter(t => t.estado === 'Asignado').length
  const pendientesAhora = all.filter(t => t.estado === 'Pendiente').length
  const resueltosAhora = all.filter(t => t.estado === 'Resuelto').length

  // Por sistema
  const porSistema: Record<string, { total: number; resueltos: number; abiertos: number }> = {}
  for (const s of SISTEMAS) porSistema[s] = { total: 0, resueltos: 0, abiertos: 0 }

  // Por responsable
  const porResponsable: Record<string, { nombre: string; total: number; resueltos: number; sumaHoras: number; cantHoras: number }> = {}

  // Por solicitante
  const porSolicitante: Record<string, { total: number; resueltos: number }> = {}

  // Rangos y días
  const rangos = RANGOS_LABELS.map(label => ({ label, total: 0 }))
  const dias   = DIAS_LABELS.map(label => ({ label, total: 0 }))

  // Atrasados
  const atrasados: { numero: string; responsable: string; estado: string; horas: number }[] = []

  let sumaHorasGlobal = 0, cantHorasGlobal = 0

  for (const t of all) {
    const ts     = new Date(t.created_at)
    const estado = t.estado as string
    const sistema = t.sistema || 'Otro'
    const mail   = t.mail_solicitante || 'SIN MAIL'
    const resp   = t.responsable
    const respId = t.responsable_id || 'sin-asignar'
    const respNombre = resp?.nombre || 'Sin asignar'
    const fechaSol = t.fecha_resolucion ? new Date(t.fecha_resolucion) : null
    const horas = estado === 'Resuelto' && fechaSol ? businessHoursDiff(ts, fechaSol) : null

    // Por sistema
    const sKey = SISTEMAS.includes(sistema) ? sistema : 'Otro'
    porSistema[sKey].total++
    if (estado === 'Resuelto') porSistema[sKey].resueltos++
    else porSistema[sKey].abiertos++

    // Por responsable
    if (!porResponsable[respId]) porResponsable[respId] = { nombre: respNombre, total: 0, resueltos: 0, sumaHoras: 0, cantHoras: 0 }
    porResponsable[respId].total++
    if (estado === 'Resuelto' && horas !== null && horas >= 0) {
      porResponsable[respId].resueltos++
      porResponsable[respId].sumaHoras += horas
      porResponsable[respId].cantHoras++
      sumaHorasGlobal += horas
      cantHorasGlobal++
    }

    // Por solicitante
    if (!porSolicitante[mail]) porSolicitante[mail] = { total: 0, resueltos: 0 }
    porSolicitante[mail].total++
    if (estado === 'Resuelto') porSolicitante[mail].resueltos++

    // Rangos horarios
    const h = ts.getHours()
    const ri = rangoMatch.findIndex(fn => fn(h))
    if (ri >= 0) rangos[ri].total++

    // Días de la semana
    const dow = ts.getDay()
    const diaIdx = dow === 0 ? 6 : dow - 1
    dias[diaIdx].total++

    // Atrasados
    if (estado !== 'Resuelto') {
      const diff = businessHoursDiff(ts, now)
      if (diff > 24) atrasados.push({ numero: t.numero, responsable: respNombre, estado, horas: diff })
    }
  }

  return NextResponse.json({
    resumen: {
      totalActual, recibidosAhora, asignadosAhora, pendientesAhora, resueltosAhora,
      promHoras: cantHorasGlobal > 0 ? sumaHorasGlobal / cantHorasGlobal : 0,
    },
    porSistema: SISTEMAS.map(s => ({ sistema: s, ...porSistema[s] })),
    porResponsable: Object.values(porResponsable).sort((a,b) => b.total - a.total),
    porSolicitante: Object.entries(porSolicitante)
      .map(([mail, v]) => ({ mail, ...v }))
      .sort((a,b) => b.total - a.total)
      .slice(0, 15),
    rangos,
    dias,
    atrasados: atrasados.sort((a,b) => b.horas - a.horas),
  })
}
