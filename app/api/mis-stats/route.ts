import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

function businessHoursDiff(start: Date, end: Date): number {
  if (end <= start) return 0
  const workStart = 9, workEnd = 18
  let totalMs = 0
  const cur = new Date(start.getFullYear(), start.getMonth(), start.getDate())
  const last = new Date(end.getFullYear(), end.getMonth(), end.getDate())
  while (cur <= last) {
    const dow = cur.getDay()
    if (dow >= 1 && dow <= 5) {
      const ws = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), workStart)
      const we = new Date(cur.getFullYear(), cur.getMonth(), cur.getDate(), workEnd)
      const iS = new Date(Math.max(ws.getTime(), start.getTime()))
      const iE = new Date(Math.min(we.getTime(), end.getTime()))
      if (iE > iS) totalMs += iE.getTime() - iS.getTime()
    }
    cur.setDate(cur.getDate() + 1)
  }
  return totalMs / (1000 * 60 * 60)
}

const RANGOS_LABELS = ['06:00–08:59', '09:00–15:59', '16:00–17:59', '18:00–05:59']
const rangoFn = [
  (h: number) => h >= 6 && h < 9,
  (h: number) => h >= 9 && h < 16,
  (h: number) => h >= 16 && h < 18,
  (h: number) => h >= 18 || h < 6,
]
const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo']

function calcStats(tickets: any[], now: Date, tipo: 'bbdd' | 'it') {
  const rangos = RANGOS_LABELS.map(l => ({ label: l, total: 0 }))
  const dias = DIAS.map(l => ({ label: l, total: 0 }))
  let resueltos = 0, abiertos = 0, totalHoras = 0, cantHoras = 0
  const porEstado: Record<string, number> = {}
  const atrasados: { numero: string; estado: string; horas: number }[] = []

  for (const t of tickets) {
    const estado = t.estado as string
    porEstado[estado] = (porEstado[estado] || 0) + 1
    if (estado === 'Resuelto') resueltos++
    else abiertos++

    const ts = new Date(t.created_at)
    const fechaRes = t.fecha_resolucion ? new Date(t.fecha_resolucion) : null
    if (estado === 'Resuelto' && fechaRes) {
      const hs = businessHoursDiff(ts, fechaRes)
      if (hs >= 0) { totalHoras += hs; cantHoras++ }
    } else {
      const hs = businessHoursDiff(ts, now)
      if (hs > 24) atrasados.push({ numero: t.numero, estado, horas: hs })
    }

    const h = ts.getHours()
    const ri = rangoFn.findIndex(fn => fn(h))
    if (ri >= 0) rangos[ri].total++

    const dow = ts.getDay()
    dias[dow === 0 ? 6 : dow - 1].total++
  }

  return {
    total: tickets.length,
    resueltos,
    abiertos,
    promHoras: cantHoras > 0 ? totalHoras / cantHoras : 0,
    porEstado,
    rangos,
    dias,
    atrasados: atrasados.sort((a, b) => b.horas - a.horas),
  }
}

export async function GET() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No auth' }, { status: 401 })

  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) return NextResponse.json({ error: 'No perfil' }, { status: 401 })

  const now = new Date()
  const rol = perfil.rol as string

  // ── Tickets BBDD donde es responsable ─────────────────────────────────
  let bbdd: any[] = []
  if (rol !== 'responsable IT') {
    const { data } = await supabase
      .from('tickets_con_responsable')
      .select('*')
      .eq('responsable_id', user.id)
      .order('created_at', { ascending: true })
    bbdd = data || []
  }

  // ── Tickets IT donde es responsable ───────────────────────────────────
  let it: any[] = []
  if (rol !== 'responsable BBDD') {
    const { data } = await supabase
      .from('tickets_it')
      .select('*')
      .eq('responsable_id', user.id)
      .order('created_at', { ascending: true })
    it = data || []
  }

  return NextResponse.json({
    perfil: { nombre: perfil.nombre, mail: perfil.mail, rol: perfil.rol },
    bbdd: bbdd.length > 0 ? calcStats(bbdd, now, 'bbdd') : null,
    it: it.length > 0 ? calcStats(it, now, 'it') : null,
  })
}
