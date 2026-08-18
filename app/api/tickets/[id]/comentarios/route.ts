import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { mailComentarioResponsable } from '@/lib/mailer'

export const dynamic = 'force-dynamic'

const MAX_COMENTARIO = 5000

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tickets_comentarios')
    .select('id, autor_tipo, autor_mail, contenido, created_at')
    .eq('ticket_id', params.id)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data || [])
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

  // La identidad sale de la sesión, nunca del body
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('perfiles').select('id, nombre, mail').eq('id', user.id).single()
  if (!perfil) return NextResponse.json({ error: 'Perfil no encontrado' }, { status: 403 })

  const { contenido } = await req.json().catch(() => ({})) as { contenido?: string }
  const texto = (contenido || '').trim()
  if (!texto) return NextResponse.json({ error: 'El comentario está vacío.' }, { status: 400 })
  if (texto.length > MAX_COMENTARIO) {
    return NextResponse.json({ error: 'El comentario es demasiado largo.' }, { status: 400 })
  }

  const { data: ticket } = await supabase
    .from('tickets_con_responsable').select('*').eq('id', params.id).single()
  if (!ticket) return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 })

  const { error } = await supabase.from('tickets_comentarios').insert({
    ticket_id: params.id,
    autor_tipo: 'responsable',
    autor_id: perfil.id,
    autor_mail: perfil.mail,
    contenido: texto,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  if (ticket.token_publico && ticket.mail_solicitante) {
    try {
      await mailComentarioResponsable({
        numero: ticket.numero,
        area_afectada: ticket.area_afectada,
        mail_solicitante: ticket.mail_solicitante,
        responsable_nombre: perfil.nombre,
        comentario: texto,
        token_publico: ticket.token_publico,
      })
    } catch (e) { console.error('mail comentario responsable:', e) }
  }

  return NextResponse.json({ ok: true })
}
