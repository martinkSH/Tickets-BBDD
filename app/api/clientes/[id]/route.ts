import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { prevResponsableId, responsable_mail, responsable_nombre, ...updates } = await req.json()
  const { data, error } = await supabase.from('clientes').update(updates).eq('id', params.id).select('*').single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (responsable_mail && updates.responsable_id && updates.responsable_id !== prevResponsableId) {
    try {
      const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
      await transporter.sendMail({ from:`"Atlas Archive" <${process.env.GMAIL_USER}>`, to:responsable_mail,
        subject:`[Alta Cliente asignada] ${data.razon_social}`,
        html:`<div style="font-family:Arial,sans-serif;font-size:13px;max-width:500px">
          <div style="background:#0a0a0a;padding:16px 20px;border-radius:8px 8px 0 0">
            <h2 style="margin:0;color:white;font-size:16px">👤 Alta de cliente asignada</h2>
          </div>
          <div style="border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;padding:16px 20px">
            <p>Hola <strong>${esc(responsable_nombre||'')}</strong>, se te asignó el alta del siguiente cliente:</p>
            <p><strong>Razón Social:</strong> ${esc(data.razon_social)}</p>
            <p><strong>Tipo:</strong> ${esc(data.tipo_cliente)}</p>
            <p><strong>Categoría:</strong> ${esc(data.categoria||'—')}</p>
            <p style="color:#9ca3af;font-size:12px;margin-top:16px">Say Hueque · Atlas Archive</p>
          </div>
        </div>`
      })
    } catch(e) { console.error('Mail asign cliente:', e) }
  }
  return NextResponse.json({ ok: true, cliente: data })
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()
  const { error } = await supabase.from('clientes').delete().eq('id', params.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
