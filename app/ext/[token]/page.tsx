'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777']
function avatarColor(s: string) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }

const ESTADO_CFG: Record<string,{label:string;color:string;bg:string}> = {
  activo:     { label:'Activo',    color:'#16a34a', bg:'#dcfce7' },
  pausado:    { label:'Pausado',   color:'#d97706', bg:'#fef3c7' },
  completado: { label:'Completado',color:'#2563eb', bg:'#dbeafe' },
}

export default function ExtLandingPage({ params }: { params: { token: string } }) {
  const [colaborador, setColaborador] = useState<any>(null)
  const [proyectos, setProyectos] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    fetch(`/api/ext?token=${params.token}`)
      .then(r => r.json())
      .then(data => {
        if (data.error) { setError(data.error); setLoading(false); return }
        setColaborador(data.colaborador)
        setProyectos(data.proyectos || [])
        setLoading(false)
      })
  }, [])

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', fontFamily:"system-ui,sans-serif" }}>
      <p style={{ color:'#9ca3af' }}>Cargando tus proyectos…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a', fontFamily:"system-ui,sans-serif" }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:48, marginBottom:16 }}>🔒</p>
        <h1 style={{ color:'white', fontSize:22, fontWeight:700, marginBottom:8 }}>Link inválido</h1>
        <p style={{ color:'#6b7280' }}>{error}</p>
      </div>
    </div>
  )

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', fontFamily:"system-ui,sans-serif" }}>
      {/* Header */}
      <div style={{ background:'#0a0a0a', padding:'14px 28px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:7, border:'1px solid #c9a96e', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:11, fontWeight:800, color:'#c9a96e' }}>A</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#c9a96e', letterSpacing:'0.1em', textTransform:'uppercase' }}>Atlas</span>
            <span style={{ fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.1em', textTransform:'uppercase' }}>Archive</span>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(colaborador?.nombre||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
            {(colaborador?.nombre||'?').charAt(0)}
          </div>
          <span style={{ color:'white', fontSize:13 }}>{colaborador?.nombre}</span>
          <span style={{ background:'#1f2937', color:'#9ca3af', borderRadius:6, padding:'2px 8px', fontSize:11 }}>Colaborador externo</span>
        </div>
      </div>

      {/* Contenido */}
      <div style={{ maxWidth:900, margin:'0 auto', padding:'32px 20px' }}>
        <div style={{ marginBottom:28 }}>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'#111827' }}>Mis proyectos</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>
            {proyectos.length > 0
              ? `Participás en ${proyectos.length} proyecto${proyectos.length!==1?'s':''}`
              : 'Sin proyectos asignados por el momento'}
          </p>
        </div>

        {proyectos.length === 0 ? (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <p style={{ fontSize:48, marginBottom:16 }}>📋</p>
            <p style={{ fontSize:16, color:'#6b7280' }}>Cuando te inviten a un proyecto vas a verlo acá.</p>
          </div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:16 }}>
            {proyectos.map((p: any) => {
              const estadoCfg = ESTADO_CFG[p.estado] || ESTADO_CFG.activo
              return (
                <div key={p.id}
                  onClick={() => router.push(`/p/${p.token}`)}
                  style={{ background:'white', borderRadius:14, border:'1px solid #e5e7eb', padding:20, cursor:'pointer', position:'relative', overflow:'hidden', transition:'all 0.15s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform='translateY(-2px)' }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow='none'; (e.currentTarget as HTMLElement).style.transform='none' }}>
                  <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:p.color||'#4f6ef7' }} />
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginTop:6, marginBottom:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      {p.espacio && <span style={{ fontSize:16 }}>{(p.espacio as any).icono}</span>}
                      <span style={{ fontSize:12, color:'#9ca3af' }}>{(p.espacio as any)?.nombre}</span>
                    </div>
                    <span style={{ background:estadoCfg.bg, color:estadoCfg.color, borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{estadoCfg.label}</span>
                  </div>
                  <h3 style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:'#111827' }}>{p.nombre}</h3>
                  {p.descripcion && <p style={{ margin:'0 0 14px', fontSize:12, color:'#9ca3af', lineHeight:1.4 }}>{p.descripcion}</p>}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', paddingTop:12, borderTop:'1px solid #f0f0f0' }}>
                    <div style={{ display:'flex', gap:12, fontSize:12, color:'#6b7280' }}>
                      <span>📋 {p.totalTareas} tarea{p.totalTareas!==1?'s':''}</span>
                      {p.misTareas > 0 && <span style={{ color:'#4f6ef7', fontWeight:600 }}>✋ {p.misTareas} mías</span>}
                    </div>
                    <span style={{ fontSize:12, color:'#4f6ef7', fontWeight:600 }}>Abrir →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
