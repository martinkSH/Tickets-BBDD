import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailComentarioSolicitante } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

// Acceso del solicitante a su propio ticket, sin login, vía el token del mail.
// Hard-scopeado a propósito: el token resuelve a UN ticket y sólo habilita dos
// acciones. Nunca se acepta un `estado` arbitrario ni una identidad del body.

const MAX_COMENTARIO = 5000

// Lo único que se expone hacia afuera. Queda deliberadamente fuera todo lo
// interno: comentario_asignacion, tipo_ticket, responsable_id, el token.
const CAMPOS_PUBLICOS = [
  'id', 'numero', 'created_at', 'estado', 'mail_solicitante', 'area_afectada',
  'motivo_tarifas', 'motivo_bd', 'proveedor', 'ciudad', 'tipo_servicio',
  'fechas_servicio', 'descripcion', 'imagen_url', 'comentario_solucion',
  'responsable_nombre', 'fecha_resolucion', 'fecha_cierre', 'cerrado_por',
  'conformidad_pedida_at',
] as const

function publico(t: any) {
  const out: Record<string, unknown> = {}
  for (const k of CAMPOS_PUBLICOS) out[k] = t[k]
  return out
}

async function porToken(supabase: ReturnType<typeof createClient>, token: string | null) {
  if (!token || token.length < 20) return null
  const { data } = await supabase
    .from('tickets_con_responsable').select('*').eq('token_publico', token).maybeSingle()
  return data
}

export async function GET(req: NextRequest) {
  const supabase = createClient()
  const ticket = await porToken(supabase, req.nextUrl.searchParams.get('token'))
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const { data: comentarios } = await supabase
    .from('tickets_comentarios')
    .select('id, autor_tipo, autor_mail, contenido, created_at')
    .eq('ticket_id', ticket.id)
    .order('created_at', { ascending: true })

  return NextResponse.json({ ticket: publico(ticket), comentarios: comentarios || [] })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json().catch(() => ({}))
  const { token, accion, contenido } = body as { token?: string; accion?: string; contenido?: string }

  const ticket = await porToken(supabase, token || null)
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  // ── Cerrar: sólo tiene sentido mientras se está esperando la conformidad ──
  if (accion === 'cerrar') {
    if (ticket.estado === 'Resuelto') {
      return NextResponse.json({ error: 'Este ticket ya está cerrado.' }, { status: 409 })
    }
    if (ticket.estado !== 'Pendiente Conformidad') {
      return NextResponse.json(
        { error: 'Este ticket todavía está en curso, no se puede cerrar.' }, { status: 409 })
    }
    const { error } = await supabase.from('tickets').update({
      estado: 'Resuelto',
      fecha_cierre: new Date().toISOString(),
      cerrado_por: 'solicitante',
    }).eq('id', ticket.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, estado: 'Resuelto' })
  }

  // ── Comentar: reabre el ticket y avisa al responsable ────────────────────
  if (accion === 'comentar') {
    const texto = (contenido || '').trim()
    if (!texto) return NextResponse.json({ error: 'El comentario está vacío.' }, { status: 400 })
    if (texto.length > MAX_COMENTARIO) {
      return NextResponse.json({ error: 'El comentario es demasiado largo.' }, { status: 400 })
    }
    if (ticket.estado === 'Resuelto') {
      return NextResponse.json(
        { error: 'Este ticket ya está cerrado. Creá uno nuevo para una consulta nueva.' }, { status: 409 })
    }

    // autor_mail sale del ticket, nunca del body
    const { error: errCom } = await supabase.from('tickets_comentarios').insert({
      ticket_id: ticket.id,
      autor_tipo: 'solicitante',
      autor_mail: ticket.mail_solicitante,
      contenido: texto,
    })
    if (errCom) return NextResponse.json({ error: errCom.message }, { status: 500 })

    // Si estaba esperando conformidad, vuelve a estar abierto: se limpia
    // fecha_resolucion para que deje de contar como resuelto y frene el reloj.
    if (ticket.estado === 'Pendiente Conformidad') {
      const { error } = await supabase.from('tickets').update({
        estado: ticket.responsable_id ? 'Asignado' : 'Recibido',
        fecha_resolucion: null,
        conformidad_pedida_at: null,
        recordatorio_enviado_at: null,
      }).eq('id', ticket.id)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    }

    if (ticket.responsable_mail) {
      try {
        await mailComentarioSolicitante({
          numero: ticket.numero,
          area_afectada: ticket.area_afectada,
          mail_solicitante: ticket.mail_solicitante,
          proveedor: ticket.proveedor,
          responsable_mail: ticket.responsable_mail,
          responsable_nombre: ticket.responsable_nombre || 'El equipo',
          comentario: texto,
        })
      } catch (e) { console.error('mail comentario solicitante:', e) }
    }

    return NextResponse.json({ ok: true, reabierto: ticket.estado === 'Pendiente Conformidad' })
  }

  return NextResponse.json({ error: 'Acción inválida' }, { status: 400 })
}
