'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'
import Link from 'next/link'

const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777']
function avatarColor(s: string) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }

interface Proyecto {
  id: string; nombre: string; color: string; estado: string
  fecha_inicio?: string; fecha_fin?: string
  espacio?: { nombre: string; icono: string }
  miembros?: any[]
  tareas_count?: number
}

export default function CalendarioPage() {
  const [perfil, setPerfil] = useState<Perfil|null>(null)
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [loading, setLoading] = useState(true)
  const [hoy] = useState(new Date())
  const [vistaInicio, setVistaInicio] = useState(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return d
  })
  const router = useRouter()
  const SEMANAS = 24 // mostrar 24 semanas (~6 meses)

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setPerfil(p)
      const res = await fetch('/api/proyectos')
      if (res.ok) {
        const data = await res.json()
        setProyectos(data.filter((p: any) => p.estado !== 'archivado'))
      }
      setLoading(false)
    }
    init()
  }, [])

  if (!perfil) return null

  // Generar semanas para el header
  const semanas: Date[] = []
  const primerLunes = new Date(vistaInicio)
  primerLunes.setDate(primerLunes.getDate() - primerLunes.getDay() + 1)
  for (let i = 0; i < SEMANAS; i++) {
    const s = new Date(primerLunes); s.setDate(s.getDate() + i * 7); semanas.push(s)
  }
  const totalDias = SEMANAS * 7
  const fechaFin = new Date(primerLunes); fechaFin.setDate(fechaFin.getDate() + totalDias)

  function dayOffset(d: Date): number {
    return Math.floor((d.getTime() - primerLunes.getTime()) / 86400000)
  }
  function pct(d: Date): number { return Math.max(0, Math.min(100, dayOffset(d) / totalDias * 100)) }

  const proyectosConFecha = proyectos.filter(p => p.fecha_inicio || p.fecha_fin)
  const proyectosSinFecha = proyectos.filter(p => !p.fecha_inicio && !p.fecha_fin)

  const hoyOffset = dayOffset(hoy)
  const hoyPct = (hoyOffset / totalDias * 100).toFixed(2)

  // Meses para el sub-header
  const mesesHeader: { label: string; leftPct: number; widthPct: number }[] = []
  let cur = new Date(primerLunes.getFullYear(), primerLunes.getMonth(), 1)
  while (cur < fechaFin) {
    const fin = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    const l = Math.max(0, pct(cur))
    const r = Math.min(100, pct(fin))
    if (r > l) mesesHeader.push({ label: `${MESES[cur.getMonth()]} ${cur.getFullYear()}`, leftPct: l, widthPct: r - l })
    cur = fin
  }

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding:'24px 28px', maxWidth:'100%', overflow:'hidden' }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            <div>
              <h1 style={{ margin:0, fontSize:22, fontWeight:700, color:'#111827' }}>Calendario de proyectos</h1>
              <p style={{ margin:'2px 0 0', fontSize:13, color:'#9ca3af' }}>Vista Gantt — carga y tiempos por proyecto</p>
            </div>
          </div>
          <div style={{ display:'flex', gap:8 }}>
            <Link href="/proyectos" style={{ display:'flex', alignItems:'center', gap:5, background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 14px', textDecoration:'none', color:'#374151', fontSize:13 }}>
              ← Proyectos
            </Link>
            <button onClick={() => setVistaInicio(d => { const n = new Date(d); n.setDate(n.getDate() - 7*4); return n })}
              style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:13, color:'#374151' }}>‹‹ 4 sem</button>
            <button onClick={() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth()-1); setVistaInicio(d) }}
              style={{ background:'#4f6ef7', border:'none', borderRadius:8, padding:'7px 14px', cursor:'pointer', fontSize:13, color:'white', fontWeight:600 }}>Hoy</button>
            <button onClick={() => setVistaInicio(d => { const n = new Date(d); n.setDate(n.getDate() + 7*4); return n })}
              style={{ background:'white', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 12px', cursor:'pointer', fontSize:13, color:'#374151' }}>4 sem ››</button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding:'60px 0', textAlign:'center', color:'#9ca3af' }}>Cargando proyectos…</div>
        ) : proyectos.length === 0 ? (
          <div style={{ padding:'60px 0', textAlign:'center', color:'#9ca3af' }}>Sin proyectos activos.</div>
        ) : (
          <div style={{ background:'white', borderRadius:14, border:'1px solid #e5e7eb', overflow:'hidden' }}>
            {/* Layout: sidebar + gantt */}
            <div style={{ display:'flex' }}>
              {/* Sidebar con nombres */}
              <div style={{ width:260, flexShrink:0, borderRight:'1px solid #e5e7eb' }}>
                {/* Header sidebar */}
                <div style={{ height:56, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.06em' }}>Proyecto</span>
                </div>
                {proyectosConFecha.map((p, i) => (
                  <div key={p.id} style={{ height:52, display:'flex', alignItems:'center', padding:'0 16px', borderBottom:'1px solid #f0f0f0', background:i%2===0?'white':'#fafafa' }}>
                    <div style={{ width:10, height:10, borderRadius:'50%', background:p.color, flexShrink:0, marginRight:10 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <p style={{ margin:0, fontSize:13, fontWeight:600, color:'#111827', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.nombre}</p>
                      <p style={{ margin:0, fontSize:11, color:'#9ca3af' }}>{p.espacio?.icono} {p.espacio?.nombre}</p>
                    </div>
                  </div>
                ))}
                {proyectosSinFecha.length > 0 && (
                  <div style={{ padding:'10px 16px', borderTop:'1px solid #f0f0f0', background:'#f9fafb' }}>
                    <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>Sin fechas definidas</p>
                    {proyectosSinFecha.map(p => (
                      <div key={p.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 0' }}>
                        <div style={{ width:8, height:8, borderRadius:'50%', background:p.color }} />
                        <span style={{ fontSize:12, color:'#6b7280' }}>{p.nombre}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Área del Gantt */}
              <div style={{ flex:1, overflow:'auto' }}>
                <div style={{ minWidth:800 }}>
                  {/* Header meses */}
                  <div style={{ height:28, position:'relative', borderBottom:'1px solid #e5e7eb', background:'#f9fafb' }}>
                    {mesesHeader.map((m, i) => (
                      <div key={i} style={{ position:'absolute', left:`${m.leftPct}%`, width:`${m.widthPct}%`, height:'100%', display:'flex', alignItems:'center', paddingLeft:8, borderRight:'1px solid #e5e7eb', boxSizing:'border-box' }}>
                        <span style={{ fontSize:11, fontWeight:600, color:'#374151', whiteSpace:'nowrap', overflow:'hidden' }}>{m.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Header semanas */}
                  <div style={{ height:28, position:'relative', borderBottom:'1px solid #e5e7eb', background:'#fafafa' }}>
                    {semanas.map((s, i) => (
                      <div key={i} style={{ position:'absolute', left:`${(i/SEMANAS*100).toFixed(2)}%`, width:`${(1/SEMANAS*100).toFixed(2)}%`, height:'100%', display:'flex', alignItems:'center', justifyContent:'center', borderRight:'1px solid #f0f0f0', boxSizing:'border-box' }}>
                        <span style={{ fontSize:10, color:'#9ca3af' }}>{s.getDate()}/{s.getMonth()+1}</span>
                      </div>
                    ))}
                    {/* Línea de hoy en header */}
                    {hoyOffset >= 0 && hoyOffset <= totalDias && (
                      <div style={{ position:'absolute', left:`${hoyPct}%`, top:0, bottom:0, width:2, background:'#ef4444', zIndex:10 }} />
                    )}
                  </div>

                  {/* Filas de proyectos */}
                  {proyectosConFecha.map((p, i) => {
                    const inicio = p.fecha_inicio ? new Date(p.fecha_inicio + 'T12:00:00') : null
                    const fin = p.fecha_fin ? new Date(p.fecha_fin + 'T12:00:00') : null
                    const left = inicio ? pct(inicio) : 0
                    const right = fin ? pct(fin) : 100
                    const width = Math.max(right - left, 1)
                    const esPasado = fin && fin < hoy
                    const esActivo = p.estado === 'activo'

                    return (
                      <div key={p.id} style={{ height:52, position:'relative', borderBottom:'1px solid #f0f0f0', background:i%2===0?'white':'#fafafa' }}>
                        {/* Líneas de semanas */}
                        {semanas.map((_, si) => (
                          <div key={si} style={{ position:'absolute', left:`${(si/SEMANAS*100).toFixed(2)}%`, top:0, bottom:0, width:1, background:'#f3f4f6' }} />
                        ))}
                        {/* Línea de hoy */}
                        {hoyOffset >= 0 && hoyOffset <= totalDias && (
                          <div style={{ position:'absolute', left:`${hoyPct}%`, top:0, bottom:0, width:2, background:'#ef444444', zIndex:5 }} />
                        )}
                        {/* Barra del proyecto */}
                        {(inicio || fin) && (
                          <div style={{ position:'absolute', left:`${left}%`, width:`${width}%`, top:'50%', transform:'translateY(-50%)', height:28, borderRadius:6, background: esPasado ? '#9ca3af' : p.color, opacity: esPasado ? 0.6 : 1, display:'flex', alignItems:'center', padding:'0 8px', boxSizing:'border-box', minWidth:4, cursor:'pointer', zIndex:3 }}
                            onClick={() => router.push('/proyectos')}
                            title={`${p.nombre}${inicio ? ' · ' + inicio.toLocaleDateString('es-AR') : ''}${fin ? ' → ' + fin.toLocaleDateString('es-AR') : ''}`}>
                            <span style={{ fontSize:12, fontWeight:600, color:'white', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                              {width > 5 ? p.nombre : ''}
                            </span>
                          </div>
                        )}
                        {/* Avatares del equipo */}
                        {fin && (
                          <div style={{ position:'absolute', right:8, top:'50%', transform:'translateY(-50%)', display:'flex' }}>
                            {(p.miembros||[]).slice(0,3).map((m: any, mi: number) => (
                              <div key={mi} title={m.perfil?.nombre} style={{ width:20, height:20, borderRadius:'50%', background:avatarColor(m.perfil?.nombre||'?'), border:'1.5px solid white', marginLeft:mi>0?-4:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:9, fontWeight:700, color:'white' }}>
                                {(m.perfil?.nombre||'?').charAt(0)}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Leyenda */}
            <div style={{ padding:'12px 16px', borderTop:'1px solid #f0f0f0', background:'#f9fafb', display:'flex', gap:20, alignItems:'center' }}>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:4, borderRadius:2, background:'#ef4444' }} />
                <span style={{ fontSize:12, color:'#6b7280' }}>Hoy</span>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                <div style={{ width:16, height:4, borderRadius:2, background:'#9ca3af' }} />
                <span style={{ fontSize:12, color:'#6b7280' }}>Proyecto pasado</span>
              </div>
              <span style={{ fontSize:12, color:'#9ca3af', marginLeft:'auto' }}>Click en una barra para abrir el proyecto</span>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  )
}
