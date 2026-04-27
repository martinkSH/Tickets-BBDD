import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tickets-bbdd-muhz.vercel.app'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { tarea_id, tarea_titulo, proyecto_id, proyecto_nombre, menciones, autor_nombre } = await req.json()
  // menciones: [{ perfil_id, nombre, mail }]
  if (!menciones?.length) return NextResponse.json({ ok: true })

  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})

  for (const m of menciones) {
    // Guardar en tabla
    await supabase.from('proyectos_menciones').upsert({ tarea_id, perfil_id: m.perfil_id })

    // Enviar mail
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: m.mail,
        subject: `${esc(autor_nombre)} te mencionó en una tarea`,
        html: `<div style="font-family:Arial,sans-serif;max-width:520px">
          <div style="background:#0a0a0a;padding:20px 24px;border-radius:8px 8px 0 0">
            <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.1em">Atlas Archive · Proyectos</p>
            <h2 style="margin:6px 0 0;color:white;font-size:18px">💬 Te mencionaron en una tarea</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:24px">
            <p style="margin:0 0 16px;font-size:14px;color:#374151">
              Hola <strong>${esc(m.nombre)}</strong>, <strong>${esc(autor_nombre)}</strong> te mencionó en:
            </p>
            <div style="background:#f9fafb;border-radius:10px;padding:14px 18px;margin-bottom:20px;border-left:4px solid #4f6ef7">
              <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;font-weight:700;text-transform:uppercase">${esc(proyecto_nombre)}</p>
              <p style="margin:0;font-size:15px;font-weight:600;color:#111827">${esc(tarea_titulo)}</p>
            </div>
            <div style="text-align:center">
              <a href="${APP_URL}/proyectos" style="display:inline-block;background:#4f6ef7;color:white;padding:10px 24px;border-radius:8px;text-decoration:none;font-size:14px;font-weight:600">Ver tarea en Atlas Archive →</a>
            </div>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px">Say Hueque · Atlas Archive</p>
          </div>
        </div>`,
      })
    } catch(e) { console.error('Mail mención:', e) }
  }

  return NextResponse.json({ ok: true })
}
