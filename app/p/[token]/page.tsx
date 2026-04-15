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

export default function ProyectoPublicoPage({ params }: { params: { token: string } }) {
  const [proyecto, setProyecto] = useState<any>(null)
  const [colaborador, setColaborador] = useState<any>(null)
  const [externos, setExternos] = useState<any[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [tareaModal, setTareaModal] = useState<any>(null)
  const [nuevaTareaLista, setNuevaTareaLista] = useState<string|null>(null)
  const [dragTarea, setDragTarea] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)

  useEffect(() => { cargar() }, [])

  const cargar = async () => {
    setLoading(true)
    const res = await fetch(`/api/proyectos/publico?token=${params.token}`)
    if (!res.ok) { setError('Link inválido o expirado.'); setLoading(false); return }
    const data = await res.json()
    setProyecto(data.proyecto)
    setColaborador(data.colaborador)
    // Cargar externos para el dropdown de asignación
    const extRes = await fetch(`/api/proyectos/externos?proyecto_id=${data.colaborador.proyecto_id}`)
    if (extRes.ok) setExternos(await extRes.json())
    setLoading(false)
  }

  const recargar = async () => {
    const res = await fetch(`/api/proyectos/publico?token=${params.token}`)
    if (res.ok) { const data = await res.json(); setProyecto(data.proyecto) }
  }

  const crearTarea = async (lista_id: string, titulo: string) => {
    if (!titulo.trim() || !proyecto) return
    await fetch('/api/proyectos/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lista_id, proyecto_id: proyecto.id, titulo: titulo.trim(), prioridad: 'media', token: params.token }),
    })
    await recargar()
    setNuevaTareaLista(null)
  }

  const moverTarea = async (tareaId: string, nuevaListaId: string) => {
    await fetch('/api/proyectos/tareas/' + tareaId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lista_id: nuevaListaId, token: params.token }),
    })
    await recargar()
  }

  const handleDrop = async (listaId: string) => {
    if (dragTarea) await moverTarea(dragTarea, listaId)
    setDragTarea(null); setDragOver(null)
  }

  if (loading) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#f9fafb', fontFamily:"'Outfit',system-ui,sans-serif" }}>
      <p style={{ color:'#9ca3af' }}>Cargando proyecto…</p>
    </div>
  )
  if (error) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center', justifyContent:'center', background:'#0a0a0a', fontFamily:"'Outfit',system-ui,sans-serif" }}>
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
    <div style={{ minHeight:'100vh', background:'#f9fafb', fontFamily:"'Outfit',system-ui,sans-serif", display:'flex', flexDirection:'column' }}>
      {/* Header */}
      <div style={{ background:'#0a0a0a', padding:'12px 24px', display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:7, border:'1px solid #c9a96e', display:'flex', alignItems:'center', justifyContent:'center' }}>
            <span style={{ fontSize:11, fontWeight:800, color:'#c9a96e' }}>A</span>
          </div>
          <div style={{ display:'flex', gap:5 }}>
            <span style={{ fontSize:12, fontWeight:700, color:'#c9a96e', letterSpacing:'0.1em', textTransform:'uppercase' }}>Atlas</span>
            <span style={{ fontSize:12, fontWeight:700, color:'white', letterSpacing:'0.1em', textTransform:'uppercase' }}>Archive</span>
          </div>
          <span style={{ color:'#333', fontSize:13, margin:'0 4px' }}>·</span>
          <span style={{ color:'#555', fontSize:13 }}>{proyecto.nombre}</span>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(colaborador?.nombre||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
            {(colaborador?.nombre||'?').charAt(0)}
          </div>
          <span style={{ color:'white', fontSize:13 }}>{colaborador?.nombre}</span>
          <span style={{ background:'#1f2937', color:'#9ca3af', borderRadius:6, padding:'2px 8px', fontSize:11 }}>Colaborador</span>
        </div>
      </div>

      {/* Barra de proyecto */}
      <div style={{ background:'white', borderBottom:'1px solid #f0f0f0', padding:'14px 24px', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:20 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <div style={{ width:12, height:12, borderRadius:3, background:proyecto.color }} />
            <span style={{ fontSize:15, fontWeight:700, color:'#111827' }}>{proyecto.nombre}</span>
            {proyecto.descripcion && <span style={{ fontSize:13, color:'#9ca3af' }}>— {proyecto.descripcion}</span>}
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:140, height:5, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
              <div style={{ width:`${progreso}%`, height:'100%', background:'#16a34a', borderRadius:3 }} />
            </div>
            <span style={{ fontSize:12, fontWeight:600, color:'#16a34a' }}>{progreso}%</span>
            <button onClick={recargar} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:7, padding:'5px 10px', cursor:'pointer', color:'#6b7280', fontSize:12 }}>↻</button>
          </div>
        </div>
      </div>

      {/* Kanban — igual que el interno */}
      <div style={{ padding:24, overflowX:'auto', flex:1 }}>
        <div style={{ display:'flex', gap:16, alignItems:'flex-start', minWidth:'max-content' }}>
          {(proyecto.listas||[]).map((lista: any) => (
            <div key={lista.id}
              onDragOver={e => { e.preventDefault(); setDragOver(lista.id) }}
              onDrop={() => handleDrop(lista.id)}
              onDragLeave={() => setDragOver(null)}
              style={{ width:280, flexShrink:0, background: dragOver===lista.id?'#f0f4ff':'#f9fafb', borderRadius:14, border:`2px ${dragOver===lista.id?'dashed #4f6ef7':'solid #e5e7eb'}`, padding:12, display:'flex', flexDirection:'column', gap:8, minHeight:200, transition:'all 0.15s' }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                  <div style={{ width:10, height:10, borderRadius:'50%', background:lista.color }} />
                  <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>{lista.nombre}</span>
                  <span style={{ fontSize:11, color:'#9ca3af', background:'#e5e7eb', borderRadius:10, padding:'1px 6px' }}>{lista.tareas.length}</span>
                </div>
                <button onClick={() => setNuevaTareaLista(lista.id)}
                  style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20, lineHeight:1, padding:'2px 4px' }}>+</button>
              </div>

              {lista.tareas.map((tarea: any) => {
                const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
                const vencida = isVencida(tarea.fecha_vencimiento)
                const subtComp = (tarea.subtareas||[]).filter((s: any) => s.completada).length
                const subtTotal = (tarea.subtareas||[]).length
                return (
                  <div key={tarea.id} draggable
                    onDragStart={() => setDragTarea(tarea.id)}
                    onDragEnd={() => setDragTarea(null)}
                    onClick={() => setTareaModal(tarea)}
                    style={{ background:'white', borderRadius:10, padding:'12px 14px', border:'1px solid #e5e7eb', cursor:'grab', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', transition:'box-shadow 0.15s' }}
                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'}>
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                      <span style={{ background:pCfg.bg, color:pCfg.color, borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:700 }}>{pCfg.label}</span>
                      {(tarea.etiquetas||[]).map((et: string) => (
                        <span key={et} style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:600 }}>{et}</span>
                      ))}
                    </div>
                    <p style={{ margin:'0 0 6px', fontSize:13, fontWeight:600, color:'#111827', lineHeight:1.4 }}>{tarea.titulo}</p>
                    {tarea.descripcion && <p style={{ margin:'0 0 6px', fontSize:11, color:'#9ca3af' }}>{tarea.descripcion.slice(0,80)}{tarea.descripcion.length>80?'…':''}</p>}
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
                      <div style={{ display:'flex', gap:8, fontSize:11 }}>
                        {subtTotal > 0 && <span style={{ color:'#6b7280' }}>✓ {subtComp}/{subtTotal}</span>}
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

              {/* Nueva tarea inline */}
              {nuevaTareaLista === lista.id ? (
                <NuevaTareaInline
                  onCrear={(titulo: string) => crearTarea(lista.id, titulo)}
                  onCancelar={() => setNuevaTareaLista(null)}
                />
              ) : (
                <button onClick={() => setNuevaTareaLista(lista.id)}
                  style={{ width:'100%', background:'none', border:'1px dashed #e5e7eb', borderRadius:10, padding:'8px', cursor:'pointer', color:'#9ca3af', fontSize:12, textAlign:'left' }}>
                  + Agregar tarea
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Modal de tarea — completo como el admin */}
      {tareaModal && (
        <TareaModalExterno
          tarea={tareaModal}
          listas={proyecto.listas||[]}
          externos={externos}
          colaborador={colaborador}
          token={params.token}
          onClose={() => setTareaModal(null)}
          onUpdated={async () => { await recargar(); setTareaModal(null) }}
          onDeleted={async () => { await recargar(); setTareaModal(null) }}
        />
      )}
    </div>
  )
}

// ── Nueva tarea inline ────────────────────────────────────────────────────
function NuevaTareaInline({ onCrear, onCancelar }: any) {
  const [texto, setTexto] = useState('')
  return (
    <div style={{ background:'white', borderRadius:10, padding:10, border:'1px solid #e5e7eb' }}>
      <textarea autoFocus value={texto} onChange={e => setTexto(e.target.value)}
        onKeyDown={e => {
          if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); if (texto.trim()) onCrear(texto) }
          if (e.key==='Escape') onCancelar()
        }}
        placeholder="Título… (Enter para crear)"
        style={{ width:'100%', border:'none', outline:'none', fontSize:13, resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}
        rows={2} />
      <div style={{ display:'flex', gap:6, marginTop:6 }}>
        <button onClick={() => { if (texto.trim()) onCrear(texto) }}
          style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>Agregar</button>
        <button onClick={onCancelar}
          style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:12 }}>Cancelar</button>
      </div>
    </div>
  )
}

// ── Modal de tarea completo para externos ─────────────────────────────────
function TareaModalExterno({ tarea: tareaInicial, listas, externos, colaborador, token, onClose, onUpdated, onDeleted }: any) {
  const [tarea, setTarea] = useState<any>(tareaInicial)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [nuevaSubtarea, setNuevaSubtarea] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setMounted(true)
    // Cargar tarea completa con comentarios
    fetch('/api/proyectos/tareas/' + tarea.id)
      .then(r => r.json()).then(data => { if (!data.error) setTarea(data) })
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose() }

  const guardar = async (updates: any) => {
    setSaving(true)
    const prevAsignadoId = tarea.asignado_id
    setTarea((t: any) => ({ ...t, ...updates }))
    await fetch('/api/proyectos/tareas/' + tarea.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, prevAsignadoId, externosProyecto: externos, token }),
    })
    setSaving(false)
  }

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/comentarios`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: nuevoComentario, token, autor_externo: colaborador.nombre, autor_mail: colaborador.mail }),
    })
    const data = await res.json()
    if (data.ok) {
      setTarea((t: any) => ({ ...t, comentarios: [...(t.comentarios||[]), { ...data.comentario, autor: { nombre: colaborador.nombre, mail: colaborador.mail } }] }))
      setNuevoComentario('')
    }
  }

  const agregarSubtarea = async () => {
    if (!nuevaSubtarea.trim()) return
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/subtareas`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: nuevaSubtarea }),
    })
    const data = await res.json()
    if (data.ok) { setTarea((t: any) => ({ ...t, subtareas: [...(t.subtareas||[]), data.subtarea] })); setNuevaSubtarea('') }
  }

  const toggleSubtarea = async (sub: any) => {
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/subtareas`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtarea_id: sub.id, completada: !sub.completada }),
    })
    const data = await res.json()
    if (data.ok) setTarea((t: any) => ({ ...t, subtareas: t.subtareas?.map((s: any) => s.id===sub.id ? { ...s, completada:!s.completada } : s) }))
  }

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch('/api/proyectos/tareas/' + tarea.id, { method: 'DELETE' })
    onDeleted()
  }

  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
  const subtComp = (tarea.subtareas||[]).filter((s: any) => s.completada).length
  const subtTotal = (tarea.subtareas||[]).length

  const content = (
    <div ref={overlayRef} onClick={handleOverlayClick}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:780, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', marginBottom:40 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <textarea value={tarea.titulo} onChange={e => setTarea((t: any) => ({...t,titulo:e.target.value}))}
              onBlur={() => guardar({ titulo: tarea.titulo })}
              style={{ width:'100%', border:'none', outline:'none', fontSize:18, fontWeight:700, color:'#111827', resize:'none', fontFamily:'inherit', lineHeight:1.3, boxSizing:'border-box' }}
              rows={2} />
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={eliminar} style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#dc2626', fontSize:12 }}>Eliminar</button>
            <button onClick={onUpdated} style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'6px 16px', cursor:'pointer', fontSize:13, fontWeight:600 }}>Guardar</button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:0 }}>
          {/* Contenido */}
          <div style={{ padding:'20px 24px', borderRight:'1px solid #f0f0f0' }}>
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Descripción</label>
            <textarea value={tarea.descripcion||''} onChange={e => setTarea((t: any) => ({...t,descripcion:e.target.value}))}
              onBlur={() => guardar({ descripcion: tarea.descripcion })}
              placeholder="Agregá una descripción…"
              style={{ width:'100%', border:'1px solid #f0f0f0', borderRadius:8, padding:'10px 12px', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', minHeight:80 }}
              rows={3} />

            {/* Subtareas */}
            <div style={{ marginTop:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>
                  Subtareas {subtTotal > 0 && <span style={{ color:'#16a34a' }}>{subtComp}/{subtTotal}</span>}
                </label>
              </div>
              {subtTotal > 0 && (
                <div style={{ height:4, background:'#f3f4f6', borderRadius:2, marginBottom:8, overflow:'hidden' }}>
                  <div style={{ width:`${subtTotal>0?Math.round(subtComp/subtTotal*100):0}%`, height:'100%', background:'#16a34a', borderRadius:2 }} />
                </div>
              )}
              {(tarea.subtareas||[]).map((sub: any) => (
                <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f9fafb' }}>
                  <input type="checkbox" checked={sub.completada} onChange={() => toggleSubtarea(sub)}
                    style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                  <span style={{ fontSize:13, color:sub.completada?'#9ca3af':'#374151', textDecoration:sub.completada?'line-through':'none', flex:1 }}>{sub.titulo}</span>
                </div>
              ))}
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <input value={nuevaSubtarea} onChange={e => setNuevaSubtarea(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') agregarSubtarea() }}
                  placeholder="+ Nueva subtarea…"
                  style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none' }} />
                <button onClick={agregarSubtarea} style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'6px 12px', fontSize:12, cursor:'pointer' }}>+</button>
              </div>
            </div>

            {/* Comentarios */}
            <div style={{ marginTop:24 }}>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:12 }}>
                Comentarios {(tarea.comentarios||[]).length > 0 && `(${(tarea.comentarios||[]).length})`}
              </label>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:12 }}>
                {(tarea.comentarios||[]).map((c: any, i: number) => (
                  <div key={c.id||i} style={{ display:'flex', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(c.autor?.nombre||c.autor_mail||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                      {(c.autor?.nombre||c.autor_mail||'?').charAt(0)}
                    </div>
                    <div style={{ flex:1, background:'#f9fafb', borderRadius:10, padding:'8px 12px' }}>
                      <div style={{ display:'flex', gap:6, marginBottom:4, alignItems:'center' }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{c.autor?.nombre||c.autor_mail}</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleString('es-AR',{day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'})}</span>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:'#374151', whiteSpace:'pre-wrap' }}>{c.contenido}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <textarea value={nuevoComentario} onChange={e => setNuevoComentario(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter' && e.ctrlKey) enviarComentario() }}
                  placeholder="Escribí un comentario… (Ctrl+Enter)"
                  style={{ flex:1, border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 10px', fontSize:13, resize:'none', outline:'none', fontFamily:'inherit' }}
                  rows={2} />
                <button onClick={enviarComentario}
                  style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'8px 14px', cursor:'pointer', alignSelf:'flex-end' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Panel lateral — igual que admin */}
          <div style={{ padding:'20px', display:'flex', flexDirection:'column', gap:16 }}>
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Lista</label>
              <select value={tarea.lista_id} onChange={e => guardar({ lista_id: e.target.value })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', background:'white' }}>
                {listas.map((l: any) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Prioridad</label>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {Object.entries(PRIORIDAD_CFG).map(([key, cfg]) => (
                  <button key={key} onClick={() => guardar({ prioridad: key })}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:'1px solid', borderColor:tarea.prioridad===key?cfg.color:'#e5e7eb', background:tarea.prioridad===key?cfg.bg:'white', cursor:'pointer', fontSize:12, fontWeight:tarea.prioridad===key?700:400, color:tarea.prioridad===key?cfg.color:'#6b7280', textAlign:'left' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Asignado a</label>
              <select value={tarea.asignado_id||''} onChange={e => guardar({ asignado_id: e.target.value||undefined, asignado_a: e.target.options[e.target.selectedIndex].text })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', background:'white' }}>
                <option value="">Sin asignar</option>
                {externos.filter((e: any) => e.activo).map((e: any) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
              </select>
              {tarea.asignado && (
                <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:6 }}>
                  <div style={{ width:22, height:22, borderRadius:'50%', background:avatarColor(tarea.asignado.nombre), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                    {tarea.asignado.nombre.charAt(0)}
                  </div>
                  <span style={{ fontSize:12, color:'#374151' }}>{tarea.asignado.nombre}</span>
                </div>
              )}
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Fecha de vencimiento</label>
              <input type="date" value={tarea.fecha_vencimiento||''}
                onChange={e => guardar({ fecha_vencimiento: e.target.value||undefined })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box', color:isVencida(tarea.fecha_vencimiento)?'#dc2626':'#374151' }} />
            </div>

            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Etiquetas</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                {(tarea.etiquetas||[]).map((et: string) => (
                  <span key={et} style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    {et}
                    <button onClick={() => guardar({ etiquetas: (tarea.etiquetas||[]).filter((e: string) => e!==et) })}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:0, fontSize:13 }}>×</button>
                  </span>
                ))}
              </div>
              <input placeholder="+ Nueva etiqueta"
                onKeyDown={e => {
                  if (e.key==='Enter' && (e.target as HTMLInputElement).value.trim()) {
                    const val = (e.target as HTMLInputElement).value.trim()
                    guardar({ etiquetas: [...(tarea.etiquetas||[]), val] });
                    (e.target as HTMLInputElement).value = ''
                  }
                }}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', fontSize:12, outline:'none', boxSizing:'border-box' }} />
            </div>

            <div style={{ marginTop:'auto', paddingTop:12, borderTop:'1px solid #f0f0f0' }}>
              <p style={{ margin:0, fontSize:11, color:'#9ca3af' }}>Creada {new Date(tarea.created_at).toLocaleDateString('es-AR')}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
  return mounted ? createPortal(content, document.body) : null
}
