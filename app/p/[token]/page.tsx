'use client'

import { useEffect, useState, useRef } from 'react'
import { createPortal } from 'react-dom'

const PRIORIDAD_CFG: Record<string,{label:string;color:string;bg:string}> = {
  urgente: { label:'Urgente', color:'#dc2626', bg:'#fee2e2' },
  alta:    { label:'Alta',    color:'#ea580c', bg:'#ffedd5' },
  media:   { label:'Media',   color:'#d97706', bg:'#fef3c7' },
  baja:    { label:'Baja',    color:'#6b7280', bg:'#f3f4f6' },
}
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777']
function avatarColor(s: string) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }
function formatDate(d?: string) { if (!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' }) }
function isVencida(d?: string) { if (!d) return false; return new Date(d) < new Date() }
function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }

export default function ProyectoPublicoPage({ params }: { params: { token: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [colaborador, setColaborador] = useState<any>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tareaModal, setTareaModal] = useState<any>(null)

  // Extraer proyecto_id del token guardado en localStorage o pedirlo al servidor
  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    // Buscar el proyecto_id buscando por token en la tabla externos
    const res = await fetch(`/api/proyectos/publico?token=${params.token}`)
    if (!res.ok) { setError('Link inválido o expirado.'); setLoading(false); return }
    const data = await res.json()
    setProyecto(data.proyecto)
    setColaborador(data.colaborador)
    setLoading(false)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb' }}>
      <p style={{ color:'#9ca3af' }}>Cargando proyecto…</p>
    </div>
  )

  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a' }}>
      <div style={{ textAlign:'center' }}>
        <p style={{ fontSize:48, marginBottom:16 }}>🔒</p>
        <h1 style={{ color:'white', fontSize:22, fontWeight:700, marginBottom:8 }}>Link inválido</h1>
        <p style={{ color:'#6b7280' }}>{error}</p>
      </div>
    </div>
  )

  const totalTareas = (proyecto.listas||[]).reduce((s: number, l: any) => s + l.tareas.length, 0)
  const completadas = (proyecto.listas||[]).find((l: any) => l.nombre.toLowerCase().includes('complet'))?.tareas.length || 0
  const progreso = totalTareas > 0 ? Math.round(completadas/totalTareas*100) : 0

  return (
    <div style={{ minHeight:'100vh', background:'#f9fafb', fontFamily:"'Outfit', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background:'#0a0a0a', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:7, border:'1px solid #c9a96e', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:11, fontWeight:800, color:'#c9a96e' }}>A</span>
          </div>
          <div>
            <div style={{ display:'flex', gap:5 }}>
              <span style={{ fontSize:12, fontWeight:700, color:'#c9a96e', letterSpacing:'0.1em', textTransform:'uppercase' }}>Atlas</span>
              <span style={{ fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.1em', textTransform:'uppercase' }}>Archive</span>
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(colaborador?.nombre||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
            {(colaborador?.nombre||'?').charAt(0)}
          </div>
          <span style={{ color:'white', fontSize:13 }}>{colaborador?.nombre}</span>
        </div>
      </div>

      {/* Info del proyecto */}
      <div style={{ background:'white', borderBottom:'1px solid #f0f0f0', padding:'20px 24px' }}>
        <div style={{ maxWidth:1200, margin:'0 auto', display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <div style={{ width:12, height:12, borderRadius:3, background:proyecto.color }} />
              <h1 style={{ margin:0, fontSize:20, fontWeight:700, color:'#111827' }}>{proyecto.nombre}</h1>
            </div>
            {proyecto.descripcion && <p style={{ margin:0, fontSize:13, color:'#9ca3af' }}>{proyecto.descripcion}</p>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            <div style={{ width:140, height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${progreso}%`, height:'100%', background:'#16a34a', borderRadius:3 }} />
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#16a34a' }}>{progreso}% completado</span>
          </div>
        </div>
      </div>

      {/* Kanban */}
      <div style={{ padding:24, overflowX:'auto' }}>
        <div style={{ display:'flex', gap:16, minWidth:'max-content' }}>
          {(proyecto.listas||[]).map((lista: any) => (
            <div key={lista.id} style={{ width:280, background:'#f9fafb', borderRadius:14, border:'1px solid #e5e7eb', padding:12, display:'flex', flexDirection:'column', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:lista.color }} />
                <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>{lista.nombre}</span>
                <span style={{ fontSize:11, color:'#9ca3af', background:'#e5e7eb', borderRadius:10, padding:'1px 6px' }}>{lista.tareas.length}</span>
              </div>
              {lista.tareas.map((tarea: any) => {
                const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
                const vencida = isVencida(tarea.fecha_vencimiento)
                const subtotalComp = (tarea.subtareas||[]).filter((s: any) => s.completada).length
                const subtotal = (tarea.subtareas||[]).length
                const esPropia = tarea.asignado?.mail === colaborador?.mail
                return (
                  <div key={tarea.id} onClick={() => setTareaModal(tarea)}
                    style={{ background:'white', borderRadius:10, padding:'12px 14px', border:`1px solid ${esPropia?'#bfdbfe':'#e5e7eb'}`, cursor:'pointer', boxShadow: esPropia?'0 0 0 2px #93c5fd33':'0 1px 3px rgba(0,0,0,0.05)' }}>
                    {esPropia && <span style={{ fontSize:10, fontWeight:700, color:'#2563eb', background:'#dbeafe', borderRadius:4, padding:'2px 6px', display:'inline-block', marginBottom:6 }}>✋ Tuya</span>}
                    <div style={{ display:'flex', gap:4, marginBottom:6 }}>
                      <span style={{ background:pCfg.bg, color:pCfg.color, borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:700 }}>{pCfg.label}</span>
                    </div>
                    <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:600, color:'#111827' }}>{tarea.titulo}</p>
                    {tarea.descripcion && <p style={{ margin:'0 0 6px', fontSize:11, color:'#9ca3af' }}>{tarea.descripcion.slice(0,60)}{tarea.descripcion.length>60?'…':''}</p>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                      <div style={{ display:'flex', gap:8, fontSize:11, color:'#9ca3af' }}>
                        {subtotal > 0 && <span>✓ {subtotalComp}/{subtotal}</span>}
                        {tarea.fecha_vencimiento && <span style={{ color:vencida?'#dc2626':'#9ca3af' }}>📅 {formatDate(tarea.fecha_vencimiento)}</span>}
                      </div>
                      {tarea.asignado && (
                        <div title={tarea.asignado.nombre} style={{ width:22, height:22, borderRadius:'50%', background:avatarColor(tarea.asignado.nombre), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                          {tarea.asignado.nombre.charAt(0)}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Modal tarea (solo lectura + comentarios) */}
      {tareaModal && (
        <TareaPublicaModal
          tarea={tareaModal} colaborador={colaborador} token={params.token}
          onClose={() => setTareaModal(null)}
          onComentarioAgregado={(comentario: any) => {
            setTareaModal((t: any) => ({ ...t, comentarios: [...(t.comentarios||[]), comentario] }))
            setProyecto((p: any) => ({ ...p, listas: p.listas.map((l: any) => ({ ...l, tareas: l.tareas.map((t: any) => t.id === tareaModal.id ? { ...t, comentarios: [...(t.comentarios||[]), comentario] } : t) })) }))
          }}
        />
      )}
    </div>
  )
}

function TareaPublicaModal({ tarea, colaborador, token, onClose, onComentarioAgregado }: any) {
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [comentarios, setComentarios] = useState(tarea.comentarios || [])
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMounted(true)
    // Cargar tarea completa
    fetch('/api/proyectos/tareas/' + tarea.id + '?token=' + token)
      .then(r => r.json())
      .then(data => { if (!data.error && data.comentarios) setComentarios(data.comentarios) })
  }, [])
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose() }

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    setEnviando(true)
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/comentarios`, {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ contenido: nuevoComentario, autor_externo: colaborador.nombre, autor_mail: colaborador.mail, token }),
    })
    const data = await res.json()
    if (data.ok) {
      const nuevo = { ...data.comentario, autor: { nombre: colaborador.nombre, mail: colaborador.mail } }
      setComentarios((c: any[]) => [...c, nuevo])
      onComentarioAgregado(nuevo)
      setNuevoComentario('')
    }
    setEnviando(false)
  }

  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
  const subtotalComp = (tarea.subtareas||[]).filter((s: any) => s.completada).length
  const subtotal = (tarea.subtareas||[]).length

  const content = (
    <div ref={overlayRef} onClick={handleOverlayClick}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:640, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', marginBottom:40 }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
          <div>
            <div style={{ display:'flex', gap:6, marginBottom:8 }}>
              <span style={{ background:pCfg.bg, color:pCfg.color, borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700 }}>{pCfg.label}</span>
              {tarea.asignado?.mail === colaborador?.mail && <span style={{ background:'#dbeafe', color:'#2563eb', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:700 }}>✋ Asignada a vos</span>}
            </div>
            <h2 style={{ margin:0, fontSize:17, fontWeight:700, color:'#111827' }}>{tarea.titulo}</h2>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20 }}>×</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {tarea.descripcion && (
            <div style={{ background:'#f9fafb', borderRadius:10, padding:14 }}>
              <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>Descripción</p>
              <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{tarea.descripcion}</p>
            </div>
          )}

          <div style={{ display:'flex', gap:16, flexWrap:'wrap', fontSize:13, color:'#6b7280' }}>
            {tarea.asignado && <span>👤 {tarea.asignado.nombre}</span>}
            {tarea.fecha_vencimiento && <span style={{ color:isVencida(tarea.fecha_vencimiento)?'#dc2626':'#6b7280' }}>📅 {formatDate(tarea.fecha_vencimiento)}</span>}
          </div>

          {subtotal > 0 && (
            <div>
              <p style={{ margin:'0 0 8px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>Subtareas ({subtotalComp}/{subtotal})</p>
              <div style={{ height:4, background:'#f3f4f6', borderRadius:2, marginBottom:10, overflow:'hidden' }}>
                <div style={{ width:`${subtotal>0?Math.round(subtotalComp/subtotal*100):0}%`, height:'100%', background:'#16a34a', borderRadius:2 }} />
              </div>
              {(tarea.subtareas||[]).map((sub: any) => (
                <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'5px 0', borderBottom:'1px solid #f9fafb' }}>
                  <div style={{ width:14, height:14, borderRadius:3, border:'1.5px solid', borderColor:sub.completada?'#16a34a':'#d1d5db', background:sub.completada?'#16a34a':'white', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {sub.completada && <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3"><polyline points="20 6 9 17 4 12"/></svg>}
                  </div>
                  <span style={{ fontSize:13, color:sub.completada?'#9ca3af':'#374151', textDecoration:sub.completada?'line-through':'none' }}>{sub.titulo}</span>
                </div>
              ))}
            </div>
          )}

          {/* Comentarios */}
          <div>
            <p style={{ margin:'0 0 12px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>
              Comentarios {comentarios.length > 0 && `(${comentarios.length})`}
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:14 }}>
              {comentarios.map((c: any, i: number) => (
                <div key={c.id||i} style={{ display:'flex', gap:10 }}>
                  <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(c.autor?.nombre||c.autor_mail||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                    {(c.autor?.nombre||c.autor_mail||'?').charAt(0)}
                  </div>
                  <div style={{ flex:1, background:'#f9fafb', borderRadius:10, padding:'8px 12px' }}>
                    <div style={{ display:'flex', gap:6, marginBottom:4, alignItems:'center' }}>
                      <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{c.autor?.nombre||c.autor_mail}</span>
                      <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                    </div>
                    <p style={{ margin:0, fontSize:13, color:'#374151', whiteSpace:'pre-wrap' }}>{c.contenido}</p>
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <textarea value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)}
                onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) enviarComentario() }}
                placeholder="Escribí un comentario… (Ctrl+Enter para enviar)"
                style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px', fontSize:13, resize:'none', outline:'none', fontFamily:'inherit' }}
                rows={2} />
              <button onClick={enviarComentario} disabled={enviando}
                style={{ background:enviando?'#9ca3af':'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', alignSelf:'flex-end' }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  return mounted ? createPortal(content, document.body) : null
}
