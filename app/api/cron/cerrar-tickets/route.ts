import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailRecordatorioConformidad } from '@/lib/mailer'
import { HORAS_CONFORMIDAD, HORAS_RECORDATORIO } from '@/lib/types'

export const dynamic = 'force-dynamic'

// Barrido diario de los tickets esperando la conformidad del solicitante:
//   · pasadas HORAS_CONFORMIDAD sin respuesta → se cierran solos
//   · a mitad de camino → un único recordatorio
// Las horas son de reloj, contadas desde conformidad_pedida_at. El cron corre
// una vez por día hábil, así que el cierre cae entre las 72 hs y la corrida
// siguiente (un ticket que vence sábado se cierra el lunes).

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient()

  const { data: pendientes, error } = await supabase
    .from('tickets_con_responsable')
    .select('id, numero, area_afectada, mail_solicitante, responsable_nombre, comentario_solucion, token_publico, conformidad_pedida_at, recordatorio_enviado_at')
    .eq('estado', 'Pendiente Conformidad')
    .not('conformidad_pedida_at', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!pendientes?.length) return NextResponse.json({ ok: true, cerrados: 0, recordatorios: 0 })

  const ahoraMs = Date.now()
  const ahora = new Date(ahoraMs).toISOString()
  let cerrados = 0
  let recordatorios = 0
  const fallos: string[] = []

  for (const t of pendientes) {
    const pedida = Date.parse(t.conformidad_pedida_at)
    if (Number.isNaN(pedida)) continue
    const hs = (ahoraMs - pedida) / 3_600_000

    // ── Vencido: se cierra solo ──
    if (hs >= HORAS_CONFORMIDAD) {
      const { error: e } = await supabase.from('tickets').update({
        estado: 'Resuelto',
        fecha_cierre: ahora,
        cerrado_por: 'auto',
      }).eq('id', t.id).eq('estado', 'Pendiente Conformidad')  // no pisar si cerró recién
      if (e) { fallos.push(`${t.numero}: ${e.message}`); continue }
      cerrados++
      continue
    }

    // ── A mitad de camino: recordatorio, una sola vez ──
    if (hs >= HORAS_RECORDATORIO && !t.recordatorio_enviado_at && t.token_publico) {
      try {
        await mailRecordatorioConformidad({
          numero: t.numero,
          area_afectada: t.area_afectada,
          mail_solicitante: t.mail_solicitante,
          responsable_nombre: t.responsable_nombre || 'El equipo',
          comentario_solucion: t.comentario_solucion,
          token_publico: t.token_publico,
        })
        // Se marca después de enviar: si el mail falla, reintenta mañana
        await supabase.from('tickets').update({ recordatorio_enviado_at: ahora }).eq('id', t.id)
        recordatorios++
      } catch (e) {
        fallos.push(`${t.numero}: recordatorio ${e}`)
      }
    }
  }

  return NextResponse.json({
    ok: true,
    revisados: pendientes.length,
    cerrados,
    recordatorios,
    ...(fallos.length ? { fallos } : {}),
  })
}
