import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mailRecuperarPassword } from '@/lib/mailer'

// Genera un link de recuperación y lo manda por nuestro Gmail (no por el SMTP de Supabase).
// Siempre responde ok para no revelar qué mails tienen cuenta.
export async function POST(req: NextRequest) {
  const { mail } = await req.json().catch(() => ({}))
  const email = String(mail || '').trim().toLowerCase()
  if (!email) return NextResponse.json({ error: 'Falta el mail' }, { status: 400 })

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error('[forgot-password] falta SUPABASE_SERVICE_ROLE_KEY')
    return NextResponse.json({ error: 'Recuperación no configurada, avisá al administrador' }, { status: 500 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin.auth.admin.generateLink({ type: 'recovery', email })
  if (error || !data?.properties?.hashed_token) {
    console.warn('[forgot-password] no se generó link para', email, error?.message)
    return NextResponse.json({ ok: true })
  }

  try {
    await mailRecuperarPassword(email, data.properties.hashed_token)
  } catch (e) {
    console.error('[forgot-password] error enviando mail', e)
    return NextResponse.json({ error: 'No se pudo enviar el mail, probá de nuevo' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
