import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
}

function fechaFmt(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  })
}

async function enviarMailCargado(t: any, mails: string[]) {
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  const prioColor: Record<string,string> = { ALTA:'#dc2626', MEDIA:'#d97706', BAJA:'#16a34a' }
  const html = `<div style="font-family:Arial,sans-serif;font-size:13.5px;max-width:560px;">
    <div style="background:#0f172a;padding:20px 24px;border-radius:8px 8px 0 0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;text-transform:uppercase;">Say Hueque · Carga Tarifarios</p>
      <h2 style="margin:6px 0 0;color:white;font-size:18px;">✓ Nuevo tarifario cargado</h2>
    </div>
    <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:20px 24px;">
      <table cellpadding="7" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:13px;">
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280;width:45%">Proveedor</td><td style="font-weight:600">${esc(t.proveedor)}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Destino</td><td>${esc(t.destino||'—')}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">País</td><td>${esc(t.pais||'—')}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Prioridad</td><td><span style="background:${prioColor[t.prioridad]||'#6b7280'};color:white;padding:2px 10px;border-radius:20px;font-size:11px;font-weight:700">${esc(t.prioridad||'—')}</span></td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Cargó</td><td>${esc(t.cargo_por||'—')}</td></tr>
        <tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Fecha de carga</td><td>${fechaFmt(t.fecha_carga)}</td></tr>
        ${t.nota_rapida?`<tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280">Nota rápida</td><td>${esc(t.nota_rapida)}</td></tr>`:''}
        ${t.nota_larga?`<tr style="border-bottom:1px solid #f3f4f6;"><td style="font-weight:700;color:#6b7280;vertical-align:top">Notas</td><td>${esc(t.nota_larga)}</td></tr>`:''}
        ${t.link?`<tr><td style="font-weight:700;color:#6b7280">Link tarifario</td><td><a href="${t.link}" style="color:#4f6ef7">Ver tarifario →</a></td></tr>`:''}
      </table>
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Saludos, Team Base de Datos · Say Hueque</p>
    </div>
  </div>`
  await transporter.sendMail({
    from: `"Tarifarios Say Hueque" <${process.env.GMAIL_USER}>`,
    to: mails.join(','),
    subject: `Se ha detectado la carga de un nuevo tarifario — ${t.proveedor}`,
    html,
  })
}

async function enviarMailAsignado(t: any, responsableMail: string, responsableNombre: string) {
  const transporter = createTransport({
    service: 'gmail',
    auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_APP_PASSWORD },
  })
  const prioColor: Record<string,string> = { ALTA:'#dc2626', MEDIA:'#d97706', BAJA:'#16a34a' }
  const html = `<div style="font-family:Arial,sans-serif;font-size:13.5px;max-width:560px;">
    <div style="background:#1e3a5f;padding:20px 24px;border-radius:8px 8px 0 0;">
      <p style="margin:0;color:#93c5fd;font-size:11px;text-transform:uppercase;">Say Hueque · Carga Tarifarios</p>
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
      <p style="margin:20px 0 0;color:#9ca3af;font-size:12px;">Saludos, Team Base de Datos · Say Hueque</p>
    </div>
  </div>`
  await transporter.sendMail({
    from: `"Tarifarios Say Hueque" <${process.env.GMAIL_USER}>`,
    to: responsableMail,
    subject: `[Tarifario asignado] ${t.proveedor} — ${t.prioridad || ''} ${t.destino || ''}`.trim(),
    html,
  })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const body = await req.json()
  const { sendMail, responsable_mail, responsable_nombre, prevCargoPor, ...updates } = body

  // Registrar fecha de carga automáticamente al marcar Cargado
  if (updates.estado === 'Cargado' && !updates.fecha_carga) {
    updates.fecha_carga = new Date().toISOString()
  }

  const { data, error } = await supabase
    .from('tarifarios').update(updates).eq('id', params.id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Mail al responsable asignado si cambia cargo_por
  if (responsable_mail && updates.cargo_por && updates.cargo_por !== prevCargoPor) {
    try {
      await enviarMailAsignado(data, responsable_mail, responsable_nombre || updates.cargo_por)
    } catch (e) { console.error('Mail asignado tarifario error:', e) }
  }

  // Mail de "cargado" a destinatarios configurados
  if (sendMail && updates.estado === 'Cargado') {
    try {
      const { data: setting } = await supabase
        .from('app_settings').select('value').eq('key', 'tarifarios_destinatarios').single()
      const destinatarios: { mail: string; area: string }[] = setting?.value || []
      const pais = (data.pais || '').toUpperCase()
      const mails = destinatarios
        .filter((d: any) => String(d.area||'').toUpperCase() !== 'ALIWEN' || pais === 'ARG')
        .map((d: any) => d.mail).filter(Boolean)
      if (mails.length > 0) {
        await enviarMailCargado(data, mails)
        await supabase.from('tarifarios').update({ fecha_envio: new Date().toISOString() }).eq('id', params.id)
      }
    } catch (e) { console.error('Mail cargado tarifario error:', e) }
  }

  return NextResponse.json({ ok: true, tarifario: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('tarifarios').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
