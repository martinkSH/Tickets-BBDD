import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { messages } = await req.json()

  const [
    { data: tarifarios },
    { data: tickets },
    { data: responsables },
  ] = await Promise.all([
    supabase.from('tarifarios').select('proveedor, destino, pais, prioridad, estado, cargo_por, fecha_carga, nota_rapida, nota_larga'),
    supabase.from('tickets_con_responsable').select('numero, area_afectada, estado, mail_solicitante, proveedor, responsable_nombre, tipo_ticket, created_at, fecha_resolucion'),
    supabase.from('perfiles').select('nombre, rol').eq('activo', true),
  ])

  function countBy(arr: any[], key: string): Record<string, number> {
    return arr.reduce((acc, item) => {
      const val = item[key] || 'Sin datos'
      acc[val] = (acc[val] || 0) + 1
      return acc
    }, {})
  }

  const tarStats = {
    total: tarifarios?.length || 0,
    porEstado: countBy(tarifarios || [], 'estado'),
    porPrioridad: countBy(tarifarios || [], 'prioridad'),
    porPais: countBy(tarifarios || [], 'pais'),
    porResponsable: countBy(tarifarios || [], 'cargo_por'),
    topDestinos: Object.entries(countBy(tarifarios || [], 'destino'))
      .sort((a,b) => (b[1] as number)-(a[1] as number)).slice(0,20)
      .map(([k,v]) => `${k}:${v}`).join(', '),
    cargadosHoy: (tarifarios || []).filter(t => {
      if (!t.fecha_carga) return false
      return new Date(t.fecha_carga).toDateString() === new Date().toDateString()
    }).length,
  }

  const tickStats = {
    total: tickets?.length || 0,
    // Abierto = todavía sin resolver. Los que esperan la conformidad del
    // solicitante ya están resueltos aunque su estado no sea 'Resuelto'.
    abiertos: (tickets || []).filter(t => !t.fecha_resolucion).length,
    porEstado: countBy(tickets || [], 'estado'),
    porArea: countBy(tickets || [], 'area_afectada'),
    porResponsable: countBy(tickets || [], 'responsable_nombre'),
    porTipo: countBy(tickets || [], 'tipo_ticket'),
  }

  const tarDetalle = (tarifarios || [])
    .map(t => `${t.proveedor}|${t.destino||''}|${t.pais||''}|${t.prioridad||''}|${t.estado}|${t.cargo_por||''}|${t.nota_rapida||''}`)
    .join('\n')

  const systemPrompt = `Sos un asistente interno de Say Hueque. Respondé siempre en español, de forma clara y concisa. Usá listas cuando sea útil.

HOY: ${new Date().toLocaleDateString('es-AR', { timeZone: 'America/Argentina/Buenos_Aires' })}

USUARIOS: ${(responsables||[]).map(r=>`${r.nombre}(${r.rol})`).join(', ')}

═══ TARIFARIOS ═══
Total: ${tarStats.total} | Cargados hoy: ${tarStats.cargadosHoy}
Por estado: ${JSON.stringify(tarStats.porEstado)}
Por prioridad: ${JSON.stringify(tarStats.porPrioridad)}
Por país: ${JSON.stringify(tarStats.porPais)}
Por responsable: ${JSON.stringify(tarStats.porResponsable)}
Top destinos: ${tarStats.topDestinos}

DETALLE (proveedor|destino|pais|prioridad|estado|responsable|nota):
${tarDetalle}

═══ TICKETS ═══
Total: ${tickStats.total} | Abiertos: ${tickStats.abiertos}
Por estado: ${JSON.stringify(tickStats.porEstado)}
Por área: ${JSON.stringify(tickStats.porArea)}
Por responsable: ${JSON.stringify(tickStats.porResponsable)}
Por tipo resolución: ${JSON.stringify(tickStats.porTipo)}

Respondé solo con la información disponible. Si no tenés el dato, decilo claramente.`

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY || '',
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: any) => ({ role: m.role, content: m.content })),
    }),
  })

  const data = await response.json()
  const text = data.content?.[0]?.text || 'No pude procesar la respuesta.'
  return NextResponse.json({ response: text })
}
