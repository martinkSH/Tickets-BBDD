'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'

// ── Types ─────────────────────────────────────────────────────────────────
interface Espacio { id: string; nombre: string; color: string; icono: string }
interface Proyecto {
  id: string; nombre: string; descripcion?: string; color: string; estado: string
  fecha_inicio?: string; fecha_fin?: string; espacio_id: string
  espacio?: Espacio; listas?: Lista[]; miembros?: any[]
}
interface Lista { id: string; nombre: string; color: string; orden: number; tareas: Tarea[] }
interface Tarea {
  id: string; titulo: string; descripcion?: string; prioridad: string; estado: string
  asignado_a?: string; asignado_id?: string; asignado?: { nombre: string; mail: string }
  fecha_vencimiento?: string; etiquetas?: string[]; lista_id: string; proyecto_id: string
  subtareas?: Subtarea[]; comentarios?: any[]; orden: number; created_at: string
}
interface Subtarea { id: string; titulo: string; completada: boolean; orden: number }

// ── Constantes ────────────────────────────────────────────────────────────
const PRIORIDAD_CFG: Record<string,{label:string;color:string;bg:string}> = {
  urgente: { label:'Urgente', color:'#dc2626', bg:'#fee2e2' },
  alta:    { label:'Alta',    color:'#ea580c', bg:'#ffedd5' },
  media:   { label:'Media',   color:'#d97706', bg:'#fef3c7' },
  baja:    { label:'Baja',    color:'#6b7280', bg:'#f3f4f6' },
}
const ESTADO_PROYECTO_CFG: Record<string,{label:string;color:string;bg:string}> = {
  activo:      { label:'Activo',      color:'#16a34a', bg:'#dcfce7' },
  pausado:     { label:'Pausado',     color:'#d97706', bg:'#fef3c7' },
  completado:  { label:'Completado',  color:'#2563eb', bg:'#dbeafe' },
  archivado:   { label:'Archivado',   color:'#6b7280', bg:'#f3f4f6' },
}
const COLORES_PROYECTO = ['#4f6ef7','#7c3aed','#059669','#e8573f','#0891b2','#d97706','#db2777']
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']
function avatarColor(s: string) { let h=0; for (const c of s) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }
function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }
function formatDate(d?: string) { if (!d) return ''; return new Date(d+'T12:00:00').toLocaleDateString('es-AR', { day:'2-digit', month:'short' }) }
function isVencida(d?: string) { if (!d) return false; return new Date(d) < new Date() }

// ── Componente principal ──────────────────────────────────────────────────
export default function ProyectosPage() {
  const [perfil, setPerfil] = useState<Perfil|null>(null)
  const [espacios, setEspacios] = useState<Espacio[]>([])
  const [proyectos, setProyectos] = useState<Proyecto[]>([])
  const [proyectoActivo, setProyectoActivo] = useState<Proyecto|null>(null)
  const [miembros, setMiembros] = useState<{id:string;nombre:string;mail:string}[]>([])
  const [view, setView] = useState<'home'|'kanban'>('home')
  const [tareaModal, setTareaModal] = useState<Tarea|null>(null)
  const [nuevaTareaLista, setNuevaTareaLista] = useState<string|null>(null)
  const [showNuevoProyecto, setShowNuevoProyecto] = useState(false)
  const [loading, setLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setPerfil(p)
      const { data: miembrosData } = await sb.from('perfiles').select('id,nombre,mail').eq('activo', true).order('nombre')
      setMiembros(miembrosData || [])
      await cargarDatos()
    }
    init()
  }, [])

  const cargarDatos = async () => {
    setLoading(true)
    const [espRes, proRes] = await Promise.all([
      fetch('/api/proyectos/espacios'),
      fetch('/api/proyectos'),
    ])
    if (espRes.ok) setEspacios(await espRes.json())
    if (proRes.ok) setProyectos(await proRes.json())
    setLoading(false)
  }

  const abrirProyecto = async (p: Proyecto) => {
    const res = await fetch('/api/proyectos/' + p.id)
    if (res.ok) {
      const data = await res.json()
      setProyectoActivo(data)
      setView('kanban')
    }
  }

  const recargarProyecto = async () => {
    if (!proyectoActivo) return
    const res = await fetch('/api/proyectos/' + proyectoActivo.id)
    if (res.ok) setProyectoActivo(await res.json())
  }

  const crearTarea = async (lista_id: string, titulo: string) => {
    if (!proyectoActivo || !titulo.trim()) return
    await fetch('/api/proyectos/tareas', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lista_id, proyecto_id: proyectoActivo.id, titulo: titulo.trim(), prioridad: 'media' }),
    })
    await recargarProyecto()
    setNuevaTareaLista(null)
  }

  const moverTarea = async (tareaId: string, nuevaListaId: string) => {
    await fetch('/api/proyectos/tareas/' + tareaId, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lista_id: nuevaListaId }),
    })
    await recargarProyecto()
  }

  if (!perfil) return null

  return (
    <AppShell perfil={perfil}>
      <div style={{ display:'flex', flexDirection:'column', height:'100vh', overflow:'hidden' }}>
        {view === 'home' ? (
          <HomeView
            espacios={espacios} proyectos={proyectos} loading={loading}
            onAbrirProyecto={abrirProyecto}
            onNuevoProyecto={() => setShowNuevoProyecto(true)}
            onRecargar={cargarDatos}
          />
        ) : proyectoActivo ? (
          <KanbanView
            proyecto={proyectoActivo}
            miembros={miembros}
            nuevaTareaLista={nuevaTareaLista}
            onSetNuevaTarea={setNuevaTareaLista}
            onCrearTarea={crearTarea}
            onMoverTarea={moverTarea}
            onTareaClick={setTareaModal}
            onVolver={() => { setView('home'); cargarDatos() }}
            onRecargar={recargarProyecto}
            perfil={perfil}
          />
        ) : null}
      </div>

      {showNuevoProyecto && (
        <NuevoProyectoModal
          espacios={espacios}
          onClose={() => setShowNuevoProyecto(false)}
          onCreado={async () => { setShowNuevoProyecto(false); await cargarDatos() }}
        />
      )}

      {tareaModal && (
        <TareaDetalleModal
          tarea={tareaModal}
          miembros={miembros}
          perfil={perfil}
          listas={proyectoActivo?.listas || []}
          onClose={() => setTareaModal(null)}
          onUpdated={async () => { await recargarProyecto(); setTareaModal(null) }}
          onDeleted={async () => { await recargarProyecto(); setTareaModal(null) }}
        />
      )}
    </AppShell>
  )
}

// ── Home View ─────────────────────────────────────────────────────────────
function HomeView({ espacios, proyectos, loading, onAbrirProyecto, onNuevoProyecto, onRecargar }: any) {
  const porEspacio = espacios.map((e: Espacio) => ({
    ...e,
    proyectos: proyectos.filter((p: Proyecto) => p.espacio_id === e.id),
  }))
  const sinEspacio = proyectos.filter((p: Proyecto) => !espacios.find((e: Espacio) => e.id === p.espacio_id))

  return (
    <div style={{ padding:32, overflowY:'auto', flex:1 }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28 }}>
        <div>
          <h1 style={{ margin:0, fontSize:26, fontWeight:700, color:'#111827' }}>Proyectos</h1>
          <p style={{ margin:'4px 0 0', fontSize:13, color:'#9ca3af' }}>{proyectos.length} proyectos activos</p>
        </div>
        <button onClick={onNuevoProyecto}
          style={{ display:'flex', alignItems:'center', gap:6, background:'#4f6ef7', color:'white', border:'none', borderRadius:10, padding:'10px 20px', fontSize:13, fontWeight:600, cursor:'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
          Nuevo Proyecto
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:80, color:'#9ca3af' }}>Cargando proyectos…</div>
      ) : proyectos.length === 0 ? (
        <div style={{ textAlign:'center', padding:80 }}>
          <p style={{ fontSize:48, marginBottom:16 }}>📋</p>
          <p style={{ fontSize:18, fontWeight:600, color:'#374151', margin:'0 0 8px' }}>Sin proyectos aún</p>
          <p style={{ fontSize:14, color:'#9ca3af', margin:'0 0 20px' }}>Creá tu primer proyecto para empezar</p>
          <button onClick={onNuevoProyecto} style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:10, padding:'10px 24px', fontSize:14, fontWeight:600, cursor:'pointer' }}>Crear proyecto</button>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:32 }}>
          {porEspacio.map((e: any) => e.proyectos.length > 0 && (
            <div key={e.id}>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <span style={{ fontSize:18 }}>{e.icono}</span>
                <h2 style={{ margin:0, fontSize:15, fontWeight:700, color:'#374151' }}>{e.nombre}</h2>
                <span style={{ fontSize:12, color:'#9ca3af', background:'#f3f4f6', borderRadius:20, padding:'2px 8px' }}>{e.proyectos.length}</span>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {e.proyectos.map((p: Proyecto) => <ProyectoCard key={p.id} proyecto={p} onClick={() => onAbrirProyecto(p)} />)}
              </div>
            </div>
          ))}
          {sinEspacio.length > 0 && (
            <div>
              <h2 style={{ fontSize:15, fontWeight:700, color:'#374151', marginBottom:14 }}>Sin espacio</h2>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:14 }}>
                {sinEspacio.map((p: Proyecto) => <ProyectoCard key={p.id} proyecto={p} onClick={() => onAbrirProyecto(p)} />)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function ProyectoCard({ proyecto, onClick }: { proyecto: Proyecto; onClick: () => void }) {
  const estadoCfg = ESTADO_PROYECTO_CFG[proyecto.estado] || ESTADO_PROYECTO_CFG.activo
  return (
    <div onClick={onClick} style={{ background:'white', borderRadius:14, border:'1px solid #e5e7eb', padding:20, cursor:'pointer', transition:'all 0.15s', position:'relative', overflow:'hidden' }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.boxShadow='0 4px 20px rgba(0,0,0,0.1)'; (e.currentTarget as HTMLElement).style.transform='translateY(-1px)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.boxShadow='none'; (e.currentTarget as HTMLElement).style.transform='none' }}>
      <div style={{ position:'absolute', top:0, left:0, right:0, height:4, background:proyecto.color }} />
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginTop:4, marginBottom:10 }}>
        <div style={{ width:36, height:36, borderRadius:10, background:proyecto.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>
          📁
        </div>
        <span style={{ background:estadoCfg.bg, color:estadoCfg.color, borderRadius:20, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{estadoCfg.label}</span>
      </div>
      <h3 style={{ margin:'0 0 6px', fontSize:15, fontWeight:700, color:'#111827' }}>{proyecto.nombre}</h3>
      {proyecto.descripcion && <p style={{ margin:'0 0 12px', fontSize:12, color:'#9ca3af', lineHeight:1.4 }}>{proyecto.descripcion}</p>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:12 }}>
        {proyecto.fecha_fin && (
          <span style={{ fontSize:11, color:isVencida(proyecto.fecha_fin)?'#dc2626':'#9ca3af' }}>
            📅 {formatDate(proyecto.fecha_fin)}
          </span>
        )}
        {(proyecto.miembros||[]).length > 0 && (
          <div style={{ display:'flex', marginLeft:'auto' }}>
            {(proyecto.miembros||[]).slice(0,4).map((m: any, i: number) => (
              <div key={i} style={{ width:24, height:24, borderRadius:'50%', background:avatarColor(m.perfil?.nombre||'?'), border:'2px solid white', marginLeft:i>0?-6:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
                {(m.perfil?.nombre||'?').charAt(0)}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Kanban View ───────────────────────────────────────────────────────────
function KanbanView({ proyecto, miembros, nuevaTareaLista, onSetNuevaTarea, onCrearTarea, onMoverTarea, onTareaClick, onVolver, onRecargar, perfil }: any) {
  const [dragTarea, setDragTarea] = useState<string|null>(null)
  const [dragOver, setDragOver] = useState<string|null>(null)
  const [nuevaTareaTexto, setNuevaTareaTexto] = useState('')

  const handleDrop = async (listaId: string) => {
    if (dragTarea && dragTarea !== listaId) {
      await onMoverTarea(dragTarea, listaId)
    }
    setDragTarea(null); setDragOver(null)
  }

  const totalTareas = (proyecto.listas||[]).reduce((s: number, l: Lista) => s + l.tareas.length, 0)
  const completadas = (proyecto.listas||[]).find((l: Lista) => l.nombre.toLowerCase().includes('complet'))?.tareas.length || 0
  const progreso = totalTareas > 0 ? Math.round(completadas/totalTareas*100) : 0

  return (
    <div style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
      {/* Header del proyecto */}
      <div style={{ padding:'16px 24px', borderBottom:'1px solid #f0f0f0', background:'white', display:'flex', alignItems:'center', gap:12, flexShrink:0 }}>
        <button onClick={onVolver} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', padding:'4px 8px', borderRadius:6, fontSize:13, display:'flex', alignItems:'center', gap:4 }}>
          ← Proyectos
        </button>
        <div style={{ width:1, height:20, background:'#f0f0f0' }} />
        <div style={{ width:32, height:32, borderRadius:8, background:proyecto.color+'22', display:'flex', alignItems:'center', justifyContent:'center' }}>
          <div style={{ width:12, height:12, borderRadius:3, background:proyecto.color }} />
        </div>
        <div style={{ flex:1 }}>
          <h2 style={{ margin:0, fontSize:16, fontWeight:700, color:'#111827' }}>{proyecto.nombre}</h2>
          {proyecto.descripcion && <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>{proyecto.descripcion}</p>}
        </div>
        {/* Barra de progreso */}
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:120, height:6, background:'#f3f4f6', borderRadius:3, overflow:'hidden' }}>
            <div style={{ width:`${progreso}%`, height:'100%', background:'#16a34a', borderRadius:3, transition:'width 0.3s' }} />
          </div>
          <span style={{ fontSize:12, fontWeight:600, color:'#16a34a' }}>{progreso}%</span>
        </div>
        <div style={{ display:'flex', marginLeft:8 }}>
          {(proyecto.miembros||[]).slice(0,5).map((m: any, i: number) => (
            <div key={i} title={m.perfil?.nombre} style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(m.perfil?.nombre||'?'), border:'2px solid white', marginLeft:i>0?-6:0, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white' }}>
              {(m.perfil?.nombre||'?').charAt(0)}
            </div>
          ))}
        </div>
        <button onClick={onRecargar} style={{ background:'#f9fafb', border:'1px solid #e5e7eb', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#6b7280', fontSize:12 }}>↻</button>
      </div>

      {/* Kanban board */}
      <div style={{ display:'flex', gap:16, padding:24, overflowX:'auto', flex:1, alignItems:'flex-start' }}>
        {(proyecto.listas||[]).map((lista: Lista) => (
          <div key={lista.id}
            onDragOver={e => { e.preventDefault(); setDragOver(lista.id) }}
            onDrop={() => handleDrop(lista.id)}
            onDragLeave={() => setDragOver(null)}
            style={{ width:280, flexShrink:0, background: dragOver===lista.id ? '#f0f4ff' : '#f9fafb', borderRadius:14, border:`2px ${dragOver===lista.id ? 'dashed #4f6ef7' : 'solid #f0f0f0'}`, padding:'12px', display:'flex', flexDirection:'column', gap:8, transition:'all 0.15s', minHeight:200 }}>
            {/* Header lista */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <div style={{ width:10, height:10, borderRadius:'50%', background:lista.color }} />
                <span style={{ fontSize:13, fontWeight:700, color:'#374151' }}>{lista.nombre}</span>
                <span style={{ fontSize:11, color:'#9ca3af', background:'#e5e7eb', borderRadius:10, padding:'1px 6px' }}>{lista.tareas.length}</span>
              </div>
              <button onClick={() => onSetNuevaTarea(lista.id)}
                style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:18, lineHeight:1, padding:'2px 4px' }}>+</button>
            </div>

            {/* Tareas */}
            {lista.tareas.map((tarea: Tarea) => (
              <TareaCard key={tarea.id} tarea={tarea}
                onDragStart={() => setDragTarea(tarea.id)}
                onDragEnd={() => setDragTarea(null)}
                onClick={() => onTareaClick(tarea)} />
            ))}

            {/* Nueva tarea inline */}
            {nuevaTareaLista === lista.id ? (
              <div style={{ background:'white', borderRadius:10, padding:10, border:'1px solid #e5e7eb' }}>
                <textarea
                  autoFocus
                  value={nuevaTareaTexto}
                  onChange={e => setNuevaTareaTexto(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onCrearTarea(lista.id, nuevaTareaTexto); setNuevaTareaTexto('') }
                    if (e.key === 'Escape') { onSetNuevaTarea(null); setNuevaTareaTexto('') }
                  }}
                  placeholder="Título de la tarea… (Enter para crear)"
                  style={{ width:'100%', border:'none', outline:'none', fontSize:13, resize:'none', fontFamily:'inherit', boxSizing:'border-box' }}
                  rows={2}
                />
                <div style={{ display:'flex', gap:6, marginTop:6 }}>
                  <button onClick={() => { onCrearTarea(lista.id, nuevaTareaTexto); setNuevaTareaTexto('') }}
                    style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:6, padding:'4px 12px', fontSize:12, cursor:'pointer', fontWeight:600 }}>Agregar</button>
                  <button onClick={() => { onSetNuevaTarea(null); setNuevaTareaTexto('') }}
                    style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:12 }}>Cancelar</button>
                </div>
              </div>
            ) : (
              <button onClick={() => onSetNuevaTarea(lista.id)}
                style={{ width:'100%', background:'none', border:'1px dashed #e5e7eb', borderRadius:10, padding:'8px', cursor:'pointer', color:'#9ca3af', fontSize:12, textAlign:'left' }}>
                + Agregar tarea
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

function TareaCard({ tarea, onDragStart, onDragEnd, onClick }: { tarea: Tarea; onDragStart: () => void; onDragEnd: () => void; onClick: () => void }) {
  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
  const vencida = isVencida(tarea.fecha_vencimiento)
  const subtotalComp = (tarea.subtareas||[]).filter(s => s.completada).length
  const subtotal = (tarea.subtareas||[]).length

  return (
    <div draggable
      onDragStart={onDragStart} onDragEnd={onDragEnd}
      onClick={onClick}
      style={{ background:'white', borderRadius:10, padding:'12px 14px', border:'1px solid #e5e7eb', cursor:'grab', boxShadow:'0 1px 3px rgba(0,0,0,0.05)', transition:'box-shadow 0.15s' }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.boxShadow='0 4px 12px rgba(0,0,0,0.1)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.boxShadow='0 1px 3px rgba(0,0,0,0.05)'}>
      {/* Prioridad + etiquetas */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:8 }}>
        <span style={{ background:pCfg.bg, color:pCfg.color, borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:700 }}>{pCfg.label}</span>
        {(tarea.etiquetas||[]).map(et => (
          <span key={et} style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:4, padding:'2px 6px', fontSize:10, fontWeight:600 }}>{et}</span>
        ))}
      </div>
      <p style={{ margin:'0 0 8px', fontSize:13, fontWeight:600, color:'#111827', lineHeight:1.4 }}>{tarea.titulo}</p>
      {tarea.descripcion && <p style={{ margin:'0 0 8px', fontSize:11, color:'#9ca3af', lineHeight:1.4 }}>{tarea.descripcion.slice(0,80)}{tarea.descripcion.length>80?'…':''}</p>}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:8 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          {subtotal > 0 && (
            <span style={{ fontSize:11, color:'#6b7280', display:'flex', alignItems:'center', gap:3 }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
              {subtotalComp}/{subtotal}
            </span>
          )}
          {tarea.fecha_vencimiento && (
            <span style={{ fontSize:11, color: vencida ? '#dc2626' : '#9ca3af', fontWeight: vencida ? 600 : 400 }}>
              📅 {formatDate(tarea.fecha_vencimiento)}
            </span>
          )}
        </div>
        {tarea.asignado && (
          <div title={tarea.asignado.nombre} style={{ width:22, height:22, borderRadius:'50%', background:avatarColor(tarea.asignado.nombre), display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700, color:'white' }}>
            {tarea.asignado.nombre.charAt(0)}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Tarea Detalle Modal ───────────────────────────────────────────────────
function TareaDetalleModal({ tarea: tareaInicial, miembros, perfil, listas, onClose, onUpdated, onDeleted }: any) {
  const [tarea, setTarea] = useState<Tarea>(tareaInicial)
  const [nuevoComentario, setNuevoComentario] = useState('')
  const [nuevaSubtarea, setNuevaSubtarea] = useState('')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => {
    setMounted(true)
    // Cargar tarea completa
    fetch('/api/proyectos/tareas/' + tarea.id).then(r => r.json()).then(data => { if (!data.error) setTarea(data) })
  }, [])

  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose() }

  const guardar = async (updates: Partial<Tarea>) => {
    setSaving(true)
    const prevAsignadoId = tarea.asignado_id
    const merged = { ...tarea, ...updates }
    setTarea(merged as Tarea)
    await fetch('/api/proyectos/tareas/' + tarea.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, prevAsignadoId }),
    })
    setSaving(false)
  }

  const enviarComentario = async () => {
    if (!nuevoComentario.trim()) return
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/comentarios`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contenido: nuevoComentario }),
    })
    const data = await res.json()
    if (data.ok) {
      setTarea(t => ({ ...t, comentarios: [...(t.comentarios||[]), data.comentario] }))
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
    if (data.ok) {
      setTarea(t => ({ ...t, subtareas: [...(t.subtareas||[]), data.subtarea] }))
      setNuevaSubtarea('')
    }
  }

  const toggleSubtarea = async (sub: Subtarea) => {
    const res = await fetch(`/api/proyectos/tareas/${tarea.id}/subtareas`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subtarea_id: sub.id, completada: !sub.completada }),
    })
    const data = await res.json()
    if (data.ok) {
      setTarea(t => ({ ...t, subtareas: t.subtareas?.map(s => s.id===sub.id ? {...s, completada:!s.completada} : s) }))
    }
  }

  const eliminar = async () => {
    if (!confirm('¿Eliminar esta tarea?')) return
    await fetch('/api/proyectos/tareas/' + tarea.id, { method: 'DELETE' })
    onDeleted()
  }

  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG.media
  const subtotalComp = (tarea.subtareas||[]).filter(s => s.completada).length
  const subtotal = (tarea.subtareas||[]).length

  const content = (
    <div ref={overlayRef} onClick={handleOverlayClick}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div style={{ background:'white', borderRadius:16, width:'100%', maxWidth:780, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', marginBottom:40 }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={{ padding:'20px 24px 16px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'flex-start', gap:12 }}>
          <div style={{ flex:1 }}>
            <textarea
              value={tarea.titulo}
              onChange={e => setTarea(t => ({...t, titulo:e.target.value}))}
              onBlur={() => guardar({ titulo: tarea.titulo })}
              style={{ width:'100%', border:'none', outline:'none', fontSize:18, fontWeight:700, color:'#111827', resize:'none', fontFamily:'inherit', lineHeight:1.3, boxSizing:'border-box' }}
              rows={2}
            />
          </div>
          <div style={{ display:'flex', gap:8, flexShrink:0 }}>
            <button onClick={eliminar} style={{ background:'none', border:'1px solid #fecaca', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#dc2626', fontSize:12 }}>Eliminar</button>
            <button onClick={() => { onUpdated() }} style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'6px 16px', cursor:'pointer', fontSize:13, fontWeight:600 }}>Guardar</button>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20 }}>×</button>
          </div>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:0 }}>
          {/* Contenido principal */}
          <div style={{ padding:'20px 24px', borderRight:'1px solid #f0f0f0' }}>
            {/* Descripción */}
            <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Descripción</label>
            <textarea
              value={tarea.descripcion||''}
              onChange={e => setTarea(t => ({...t, descripcion:e.target.value}))}
              onBlur={() => guardar({ descripcion: tarea.descripcion })}
              placeholder="Agregá una descripción…"
              style={{ width:'100%', border:'1px solid #f0f0f0', borderRadius:8, padding:'10px 12px', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', minHeight:80, color:'#374151' }}
              rows={3}
            />

            {/* Subtareas */}
            <div style={{ marginTop:20 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>
                  Subtareas {subtotal > 0 && <span style={{ color:'#16a34a' }}>{subtotalComp}/{subtotal}</span>}
                </label>
              </div>
              {subtotal > 0 && (
                <div style={{ height:4, background:'#f3f4f6', borderRadius:2, marginBottom:10, overflow:'hidden' }}>
                  <div style={{ width:`${subtotal>0?Math.round(subtotalComp/subtotal*100):0}%`, height:'100%', background:'#16a34a', borderRadius:2 }} />
                </div>
              )}
              {(tarea.subtareas||[]).map(sub => (
                <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 0', borderBottom:'1px solid #f9fafb' }}>
                  <input type="checkbox" checked={sub.completada} onChange={() => toggleSubtarea(sub)}
                    style={{ width:15, height:15, accentColor:'#16a34a', cursor:'pointer' }} />
                  <span style={{ fontSize:13, color:sub.completada?'#9ca3af':'#374151', textDecoration:sub.completada?'line-through':'none', flex:1 }}>{sub.titulo}</span>
                </div>
              ))}
              <div style={{ display:'flex', gap:6, marginTop:8 }}>
                <input value={nuevaSubtarea} onChange={e => setNuevaSubtarea(e.target.value)}
                  onKeyDown={e => { if (e.key==='Enter') agregarSubtarea() }}
                  placeholder="+ Agregar subtarea…"
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
                {(tarea.comentarios||[]).map((c: any) => (
                  <div key={c.id} style={{ display:'flex', gap:10 }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:avatarColor(c.autor?.nombre||'?'), display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'white', flexShrink:0 }}>
                      {(c.autor?.nombre||'?').charAt(0)}
                    </div>
                    <div style={{ flex:1, background:'#f9fafb', borderRadius:10, padding:'8px 12px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:4 }}>
                        <span style={{ fontSize:12, fontWeight:600, color:'#374151' }}>{c.autor?.nombre||c.autor_mail}</span>
                        <span style={{ fontSize:11, color:'#9ca3af' }}>{new Date(c.created_at).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}</span>
                      </div>
                      <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.5, whiteSpace:'pre-wrap' }}>{c.contenido}</p>
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
                <button onClick={enviarComentario} style={{ background:'#4f6ef7', color:'white', border:'none', borderRadius:8, padding:'8px 14px', fontSize:13, cursor:'pointer', alignSelf:'flex-end' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
                </button>
              </div>
            </div>
          </div>

          {/* Panel lateral */}
          <div style={{ padding:'20px 20px', display:'flex', flexDirection:'column', gap:16 }}>
            {/* Estado */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Lista</label>
              <select value={tarea.lista_id} onChange={e => guardar({ lista_id: e.target.value })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', background:'white' }}>
                {listas.map((l: Lista) => <option key={l.id} value={l.id}>{l.nombre}</option>)}
              </select>
            </div>

            {/* Prioridad */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Prioridad</label>
              <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                {Object.entries(PRIORIDAD_CFG).map(([key, cfg]) => (
                  <button key={key} onClick={() => guardar({ prioridad: key })}
                    style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 10px', borderRadius:8, border:'1px solid', borderColor: tarea.prioridad===key?cfg.color:'#e5e7eb', background: tarea.prioridad===key?cfg.bg:'white', cursor:'pointer', fontSize:12, fontWeight: tarea.prioridad===key?700:400, color: tarea.prioridad===key?cfg.color:'#6b7280', textAlign:'left' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0 }} />
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Asignado */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Asignado a</label>
              <select value={tarea.asignado_id||''} onChange={e => guardar({ asignado_id: e.target.value||null, asignado_a: e.target.options[e.target.selectedIndex].text })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', background:'white' }}>
                <option value="">Sin asignar</option>
                {miembros.map((m: any) => <option key={m.id} value={m.id}>{m.nombre}</option>)}
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

            {/* Fecha vencimiento */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Fecha de vencimiento</label>
              <input type="date" value={tarea.fecha_vencimiento||''}
                onChange={e => guardar({ fecha_vencimiento: e.target.value||null })}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'7px 10px', fontSize:13, outline:'none', boxSizing:'border-box', color: isVencida(tarea.fecha_vencimiento)?'#dc2626':'#374151' }} />
            </div>

            {/* Etiquetas */}
            <div>
              <label style={{ display:'block', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase', marginBottom:6 }}>Etiquetas</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:6 }}>
                {(tarea.etiquetas||[]).map(et => (
                  <span key={et} style={{ background:'#ede9fe', color:'#7c3aed', borderRadius:6, padding:'3px 8px', fontSize:11, fontWeight:600, display:'flex', alignItems:'center', gap:4 }}>
                    {et}
                    <button onClick={() => guardar({ etiquetas: (tarea.etiquetas||[]).filter(e => e!==et) })}
                      style={{ background:'none', border:'none', cursor:'pointer', color:'#7c3aed', padding:0, lineHeight:1, fontSize:13 }}>×</button>
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

            {/* Fecha creación */}
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

// ── Nuevo Proyecto Modal ──────────────────────────────────────────────────
function NuevoProyectoModal({ espacios, onClose, onCreado }: any) {
  const [form, setForm] = useState({ nombre:'', descripcion:'', espacio_id:'', color:'#4f6ef7', estado:'activo', fecha_inicio:'', fecha_fin:'' })
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const overlayRef = useRef<HTMLDivElement>(null)
  useEffect(() => setMounted(true), [])
  const handleOverlayClick = (e: React.MouseEvent) => { if (e.target === overlayRef.current) onClose() }

  const crear = async () => {
    if (!form.nombre.trim()) return
    setSaving(true)
    const res = await fetch('/api/proyectos', {
      method:'POST', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ ...form, espacio_id: form.espacio_id||null, fecha_inicio: form.fecha_inicio||null, fecha_fin: form.fecha_fin||null }),
    })
    if (res.ok) onCreado()
    setSaving(false)
  }

  const content = (
    <div ref={overlayRef} onClick={handleOverlayClick}
      style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:'24px' }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'white', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', padding:'28px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{ width:40, height:40, borderRadius:10, background:form.color+'22', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>📁</div>
          <h2 style={{ margin:0, fontSize:18, fontWeight:700 }}>Nuevo proyecto</h2>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }}>Nombre *</label>
            <input value={form.nombre} onChange={e => setForm(f=>({...f,nombre:e.target.value}))}
              placeholder="Nombre del proyecto…" autoFocus
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }}>Descripción</label>
            <textarea value={form.descripcion} onChange={e => setForm(f=>({...f,descripcion:e.target.value}))} rows={2}
              placeholder="Descripción opcional…"
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', resize:'none', fontFamily:'inherit', boxSizing:'border-box' }} />
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }}>Espacio</label>
            <select value={form.espacio_id} onChange={e => setForm(f=>({...f,espacio_id:e.target.value}))}
              style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', background:'white' }}>
              <option value="">Sin espacio</option>
              {espacios.map((e: Espacio) => <option key={e.id} value={e.id}>{e.icono} {e.nombre}</option>)}
            </select>
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }}>Fecha inicio</label>
              <input type="date" value={form.fecha_inicio} onChange={e => setForm(f=>({...f,fecha_inicio:e.target.value}))}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5 }}>Fecha fin</label>
              <input type="date" value={form.fecha_fin} onChange={e => setForm(f=>({...f,fecha_fin:e.target.value}))}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'9px 12px', fontSize:13, outline:'none', boxSizing:'border-box' }} />
            </div>
          </div>
          <div>
            <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:8 }}>Color</label>
            <div style={{ display:'flex', gap:8 }}>
              {COLORES_PROYECTO.map(c => (
                <button key={c} onClick={() => setForm(f=>({...f,color:c}))}
                  style={{ width:28, height:28, borderRadius:'50%', background:c, border: form.color===c ? '3px solid #111827' : '3px solid transparent', cursor:'pointer', transition:'border 0.15s' }} />
              ))}
            </div>
          </div>
        </div>

        <div style={{ display:'flex', gap:8, marginTop:24, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'9px 18px', fontSize:13, borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer' }}>Cancelar</button>
          <button onClick={crear} disabled={saving||!form.nombre.trim()}
            style={{ padding:'9px 24px', fontSize:13, fontWeight:600, borderRadius:8, border:'none', background:saving?'#9ca3af':'#4f6ef7', color:'white', cursor:saving?'not-allowed':'pointer' }}>
            {saving?'Creando…':'Crear proyecto'}
          </button>
        </div>
      </div>
    </div>
  )
  return mounted ? createPortal(content, document.body) : null
}
