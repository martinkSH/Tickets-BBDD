import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

async function enviarMailAsignado(t: any, responsableMail: string, responsableNombre: string) {
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  const prioColor: Record<string,string> = { ALTA:'#dc2626', MEDIA:'#d97706', BAJA:'#16a34a' }
  const html = `<div style="font-family:Arial,sans-serif;font-size:13.5px;max-width:560px;">
    <div style="background:#1e3a5f;padding:20px 24px;border-radius:8px 8px 0 0;">
      <p style="margin:0;color:#93c5fd;font-size:11px;text-transform:uppercase;">Say Hueque · Atlas Archive</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px;">📋 Tenés un tarifario asignado</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;">
      <p style="margin:0 0 16px;color:#374151;">Hola <strong>${esc(responsableNombre)}</strong>, se te asignó el siguiente tarifario para cargar:</p>
      <table cellpadding="7" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280;width:45%">Proveedor</td><td style="font-weight:600;color:#111827">${esc(t.proveedor)}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Destino</td><td>${esc(t.destino||'—')}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">País</td><td>${esc(t.pais||'—')}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Prioridad</td><td><span style="background:${prioColor[t.prioridad]||'#6b7280'};color:white;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${esc(t.prioridad||'—')}</span></td></tr>
        ${t.nota_rapida?`<tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Nota rápida</td><td>${esc(t.nota_rapida)}</td></tr>`:''}
        ${t.nota_larga?`<tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280;vertical-align:top">Notas</td><td>${esc(t.nota_larga)}</td></tr>`:''}
        ${t.link?`<tr><td style="font-weight:700;color:#6b7280">Link tarifario</td><td><a href="${t.link}" style="color:#4f6ef7">Ver tarifario →</a></td></tr>`:''}
      </table>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Saludos, Say Hueque · Atlas Archive</p>
    </div>
  </div>`
  await transporter.sendMail({
    from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
    to: responsableMail,
    subject: `[Tarifario asignado] ${t.proveedor} — ${t.prioridad||''} ${t.destino||''}`.trim(),
    html,
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const body = await req.json()
  const { responsable_mail, responsable_nombre, ...tarifarioData } = body

  const { data, error } = await supabase
    .from('tarifarios').insert(tarifarioData).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mandar mail si se creó con responsable asignado
  if (data.cargo_por && responsable_mail) {
    try {
      await enviarMailAsignado(data, responsable_mail, responsable_nombre || data.cargo_por)
    } catch (e) { console.error('Mail asignado nuevo tarifario error:', e) }
  }

  return NextResponse.json({ ok: true, tarifario: data })
}
