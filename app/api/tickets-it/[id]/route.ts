import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json()
  const { sendMail, responsable_mail, responsable_nombre, prevResponsableId, ...updates } = body

  if (updates.estado === 'Resuelto' && !updates.fecha_resolucion) {
    updates.fecha_resolucion = new Date().toISOString()
  }

  const { data, error } = await supabase.from('tickets_it').update(updates).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})

  // Mail asignación
  if (responsable_mail && updates.responsable_id && updates.responsable_id !== prevResponsableId) {
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: responsable_mail,
        subject: `[${data.numero}] Ticket IT asignado — ${data.sistema}`,
        html: `<div style="font-family:Arial,sans-serif;font-size:13px;max-width:500px">
          <div style="background:#0a0a0a;padding:16px 20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;color:white;font-size:16px">🖥️ Ticket IT asignado</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px">
            <p>Hola <strong>${esc(responsable_nombre||'')}</strong>, se te asignó el ticket <strong>${esc(data.numero||'')}</strong>.</p>
            <p><strong>Sistema:</strong> ${esc(data.sistema)}</p>
            <p><strong>Solicitante:</strong> ${esc(data.mail_solicitante)}</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px">Say Hueque · Atlas Archive</p>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail asign IT:', e) }
  }

  // Mail resolución al solicitante
  if (sendMail && updates.estado === 'Resuelto') {
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: data.mail_solicitante,
        subject: `[${data.numero}] Tu ticket IT fue resuelto`,
        html: `<div style="font-family:Arial,sans-serif;max-width:560px">
          <div style="background:#064e3b;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#6ee7b7;font-size:11px;text-transform:uppercase">Atlas Archive · Ticket IT</p>
            <h2 style="margin:6px 0 0;color:white;font-size:18px">✓ Tu ticket fue resuelto</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px">
            <p><strong>Ticket:</strong> ${esc(data.numero||'')}</p>
            <p><strong>Sistema:</strong> ${esc(data.sistema)}</p>
            ${updates.comentario_solucion ? `
            <div style="background:#f0fdf4;border-radius:8px;padding:14px;margin-top:12px">
              <p style="margin:0 0 6px;font-size:11px;font-weight:700;color:#16a34a;text-transform:uppercase">Resolución</p>
              <div style="font-size:13px;color:#374151;white-space:pre-wrap">${esc(updates.comentario_solucion)}</div>
            </div>` : ''}
            <p style="margin:20px 0 0;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail resuelto IT:', e) }
  }

  return NextResponse.json({ ok: true, ticket: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('tickets_it').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
