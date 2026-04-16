import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createTransport } from 'nodemailer'

function esc(s: string) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;') }

function formatFecha(d?: string) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-AR', { day:'2-digit', month:'short', year:'numeric' })
}

function duracion(desde?: string, hasta?: string) {
  if (!desde || !hasta) return null
  const ms = new Date(hasta).getTime() - new Date(desde).getTime()
  const dias = Math.floor(ms / 86400000)
  if (dias === 0) return 'menos de 1 día'
  return `${dias} día${dias !== 1 ? 's' : ''}`
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const supabase = createClient()

  // Marcar proyecto como completado
  const { data: proyecto, error: errP } = await supabase
    .from('proyectos')
    .update({ estado: 'completado', updated_at: new Date().toISOString() })
    .eq('id', params.id)
    .select('*, espacio:espacio_id(nombre), creador:creador_id(nombre,mail)')
    .single()
  if (errP) return NextResponse.json({ error: errP.message }, { status: 500 })

  // Traer todas las tareas con responsables y subtareas
  const { data: listas } = await supabase
    .from('proyectos_listas')
    .select('nombre, color, tareas:proyectos_tareas(*, asignado:asignado_id(nombre,mail), asignado_externo:asignado_externo_id(nombre,mail), subtareas:proyectos_subtareas(*))')
    .eq('proyecto_id', params.id)
    .order('orden')

  // Traer miembros internos
  const { data: miembros } = await supabase
    .from('proyectos_miembros')
    .select('perfil:perfil_id(nombre,mail)')
    .eq('proyecto_id', params.id)

  // Traer colaboradores externos
  const { data: externos } = await supabase
    .from('proyectos_externos')
    .select('nombre,mail')
    .eq('proyecto_id', params.id)
    .eq('activo', true)

  // Recopilar todos los destinatarios únicos
  const destinatarios = new Map<string, string>()
  ;(miembros || []).forEach((m: any) => { if (m.perfil?.mail) destinatarios.set(m.perfil.mail, m.perfil.nombre) })
  ;(externos || []).forEach((e: any) => { if (e.mail) destinatarios.set(e.mail, e.nombre) })
  if (proyecto.creador?.mail) destinatarios.set(proyecto.creador.mail, proyecto.creador.nombre)

  if (destinatarios.size === 0) return NextResponse.json({ ok: true, mensaje: 'Proyecto finalizado sin destinatarios' })

  // Construir el resumen de tareas por lista
  const totalTareas = (listas || []).reduce((s: number, l: any) => s + (l.tareas?.length || 0), 0)
  const tareasCompletas = (listas || [])
    .filter((l: any) => l.nombre.toLowerCase().includes('complet'))
    .reduce((s: number, l: any) => s + (l.tareas?.length || 0), 0)

  let seccionesHTML = ''
  for (const lista of (listas || []) as any[]) {
    if (!lista.tareas?.length) continue
    const tareasHTML = lista.tareas.map((t: any) => {
      const responsable = t.asignado?.nombre || t.asignado_externo?.nombre || t.asignado_a || 'Sin asignar'
      const subtotalComp = (t.subtareas||[]).filter((s: any) => s.completada).length
      const subtotal = (t.subtareas||[]).length
      const dur = duracion(t.created_at, t.fecha_vencimiento || t.updated_at)
      return `
        <tr style="border-bottom:1px solid #f3f4f6">
          <td style="padding:10px 12px;font-size:13px;color:#111827;vertical-align:top">${esc(t.titulo)}</td>
          <td style="padding:10px 12px;font-size:13px;color:#374151;vertical-align:top">${esc(responsable)}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280;vertical-align:top;white-space:nowrap">${formatFecha(t.created_at)}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280;vertical-align:top;white-space:nowrap">${dur || '—'}</td>
          <td style="padding:10px 12px;font-size:12px;color:#6b7280;vertical-align:top;text-align:center">${subtotal > 0 ? `${subtotalComp}/${subtotal}` : '—'}</td>
        </tr>`
    }).join('')

    seccionesHTML += `
      <div style="margin-bottom:24px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <div style="width:10px;height:10px;border-radius:50%;background:${esc(lista.color)};display:inline-block"></div>
          <span style="font-size:13px;font-weight:700;color:#374151;text-transform:uppercase;letter-spacing:0.05em">${esc(lista.nombre)}</span>
          <span style="font-size:11px;color:#9ca3af">(${lista.tareas.length} tarea${lista.tareas.length !== 1 ? 's' : ''})</span>
        </div>
        <table cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;border:1px solid #f0f0f0;border-radius:8px;overflow:hidden">
          <thead>
            <tr style="background:#f9fafb">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Tarea</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Responsable</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Creada</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Duración</th>
              <th style="padding:8px 12px;text-align:center;font-size:11px;font-weight:700;color:#6b7280;text-transform:uppercase">Subtareas</th>
            </tr>
          </thead>
          <tbody>${tareasHTML}</tbody>
        </table>
      </div>`
  }

  // Participantes
  const participantesHTML = Array.from(destinatarios.entries()).map(([mail, nombre]) =>
    `<span style="display:inline-block;background:#f3f4f6;border-radius:20px;padding:3px 10px;font-size:12px;margin:2px">${esc(nombre)}</span>`
  ).join(' ')

  const progreso = totalTareas > 0 ? Math.round(tareasCompletas / totalTareas * 100) : 0

  const html = `
  <div style="font-family:Arial,sans-serif;max-width:700px;margin:0 auto">
    <!-- Header -->
    <div style="background:#0a0a0a;padding:24px 28px;border-radius:10px 10px 0 0">
      <p style="margin:0;color:#c9a96e;font-size:11px;text-transform:uppercase;letter-spacing:.12em">Atlas Archive · Proyectos</p>
      <h1 style="margin:8px 0 4px;color:white;font-size:22px;font-weight:700">✅ Proyecto finalizado</h1>
      <p style="margin:0;color:rgba(255,255,255,0.6);font-size:15px">${esc(proyecto.nombre)}</p>
    </div>

    <!-- Resumen ejecutivo -->
    <div style="background:white;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 10px 10px">
      <div style="padding:24px 28px;border-bottom:1px solid #f0f0f0">
        <div style="display:flex;gap:0;border:1px solid #e5e7eb;border-radius:10px;overflow:hidden">
          <div style="flex:1;padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb">
            <p style="margin:0;font-size:28px;font-weight:700;color:#111827">${totalTareas}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Tareas totales</p>
          </div>
          <div style="flex:1;padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb">
            <p style="margin:0;font-size:28px;font-weight:700;color:#16a34a">${tareasCompletas}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Completadas</p>
          </div>
          <div style="flex:1;padding:16px 20px;text-align:center;border-right:1px solid #e5e7eb">
            <p style="margin:0;font-size:28px;font-weight:700;color:#4f6ef7">${progreso}%</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Progreso</p>
          </div>
          <div style="flex:1;padding:16px 20px;text-align:center">
            <p style="margin:0;font-size:28px;font-weight:700;color:#7c3aed">${destinatarios.size}</p>
            <p style="margin:4px 0 0;font-size:12px;color:#9ca3af">Participantes</p>
          </div>
        </div>
      </div>

      <!-- Fechas y espacio -->
      <div style="padding:16px 28px;border-bottom:1px solid #f0f0f0;display:flex;gap:24px;font-size:13px;color:#6b7280">
        ${proyecto.espacio ? `<span>📁 ${esc(proyecto.espacio.nombre)}</span>` : ''}
        <span>📅 Iniciado: ${formatFecha(proyecto.created_at)}</span>
        <span>🏁 Finalizado: ${formatFecha(new Date().toISOString())}</span>
      </div>

      <!-- Participantes -->
      <div style="padding:16px 28px;border-bottom:1px solid #f0f0f0">
        <p style="margin:0 0 10px;font-size:12px;font-weight:700;color:#6b7280;text-transform:uppercase;letter-spacing:0.06em">Participantes</p>
        <div>${participantesHTML}</div>
      </div>

      <!-- Tareas por lista -->
      <div style="padding:24px 28px">
        <p style="margin:0 0 20px;font-size:14px;font-weight:700;color:#111827">Detalle de tareas</p>
        ${seccionesHTML || '<p style="color:#9ca3af;font-size:13px">Sin tareas registradas.</p>'}
      </div>

      <div style="padding:16px 28px;background:#f9fafb;border-top:1px solid #f0f0f0;border-radius:0 0 10px 10px">
        <p style="margin:0;font-size:12px;color:#9ca3af">Say Hueque · Atlas Archive · Resumen de proyecto</p>
      </div>
    </div>
  </div>`

  // Enviar a todos los participantes
  const transporter = createTransport({ service:'gmail', auth:{ user:process.env.GMAIL_USER, pass:process.env.GMAIL_APP_PASSWORD }})
  const errores: string[] = []
  for (const [mail, nombre] of destinatarios) {
    try {
      await transporter.sendMail({
        from: `"Atlas Archive" <${process.env.GMAIL_USER}>`,
        to: mail,
        subject: `✅ Proyecto "${proyecto.nombre}" finalizado — Resumen`,
        html,
      })
    } catch(e: any) {
      errores.push(`${mail}: ${e.message}`)
    }
  }

  return NextResponse.json({ ok: true, destinatarios: destinatarios.size, errores })
}
