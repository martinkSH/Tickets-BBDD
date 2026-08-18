import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { ticket_id } = await req.json()

  // Verificar si el auto-asignador está activo
  const { data: setting } = await supabase
    .from('app_settings').select('value').eq('key', 'auto_assign_enabled').single()
  if (!setting?.value) return NextResponse.json({ ok: false, reason: 'desactivado' })

  const { data: ticket } = await supabase
    .from('tickets').select('*').eq('id', ticket_id).single()
  if (!ticket) return NextResponse.json({ ok: false, reason: 'ticket no encontrado' })

  // Solo asignar si no tiene responsable aún
  if (ticket.responsable_id) return NextResponse.json({ ok: false, reason: 'ya asignado' })

  const { data: responsables } = await supabase
    .from('perfiles').select('id, nombre, mail')
    .eq('activo', true).eq('rol', 'responsable')
  if (!responsables?.length) return NextResponse.json({ ok: false, reason: 'sin responsables' })

  // Historial últimos 6 meses
  const seisAtras = new Date()
  seisAtras.setMonth(seisAtras.getMonth() - 6)
  const { data: historial } = await supabase
    .from('tickets')
    .select('responsable_id, mail_solicitante, proveedor')
    .gte('created_at', seisAtras.toISOString())
    .not('responsable_id', 'is', null)

  // Carga actual: sólo lo que tiene trabajo pendiente. Los que esperan la
  // conformidad del solicitante ya están resueltos y no cuentan como carga.
  const { data: abiertos } = await supabase
    .from('tickets').select('responsable_id')
    .is('fecha_resolucion', null).not('responsable_id', 'is', null)

  const cargaActual: Record<string, number> = {}
  for (const t of abiertos || []) {
    cargaActual[t.responsable_id] = (cargaActual[t.responsable_id] || 0) + 1
  }

  // Scoring
  const scores: Record<string, { total: number; solicitante: number; proveedor: number; carga: number }> = {}
  for (const r of responsables) {
    const hist = (historial || []).filter(h => h.responsable_id === r.id)
    const puntSolicitante = Math.min(hist.filter(h => h.mail_solicitante === ticket.mail_solicitante).length * 8, 40)
    const puntProveedor = ticket.proveedor
      ? Math.min(hist.filter(h => h.proveedor?.toLowerCase() === ticket.proveedor?.toLowerCase()).length * 10, 30)
      : 0
    const carga = cargaActual[r.id] || 0
    const puntCarga = -Math.min(carga * 5, 30)
    scores[r.id] = {
      total: puntSolicitante + puntProveedor + puntCarga,
      solicitante: puntSolicitante,
      proveedor: puntProveedor,
      carga: puntCarga,
    }
  }

  const mejor = responsables
    .map(r => ({ ...r, ...scores[r.id] }))
    .sort((a, b) => b.total - a.total)[0]

  const { error } = await supabase
    .from('tickets')
    .update({ responsable_id: mejor.id, estado: 'Asignado', assigned_at: new Date().toISOString() })
    .eq('id', ticket_id)

  if (error) return NextResponse.json({ ok: false, reason: error.message })

  const scoreLog = responsables
    .map(r => `${r.nombre}: ${scores[r.id].total} (sol:${scores[r.id].solicitante} prov:${scores[r.id].proveedor} carga:${scores[r.id].carga})`)
    .sort((a, b) => {
      const sa = parseInt(a.split(': ')[1])
      const sb = parseInt(b.split(': ')[1])
      return sb - sa
    })

  console.log(`[AUTO-ASSIGN] ${ticket_id} → ${mejor.nombre}`)
  console.log('[AUTO-ASSIGN] Scores:', scoreLog.join(' | '))

  return NextResponse.json({ ok: true, asignado_a: mejor.nombre, asignado_id: mejor.id })
}
