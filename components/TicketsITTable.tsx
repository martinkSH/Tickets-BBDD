'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Perfil } from '@/lib/types'
import AutoRefresh from './AutoRefresh'

interface TicketIT {
  id: string; numero: string; created_at: string
  mail_solicitante: string; sistema: string
  modulo_tourplan?: string; modulo_pythagoras?: string; modulo_b2c?: string
  codigo_file?: string; nro_voucher?: string
  codigo_cliente_proveedor?: string; codigo_producto?: string
  codigo_file_tourplan?: string; codigo_file_pythagoras?: string
  link_itinerario?: string; descripcion: string; imagen_url?: string
  estado: string; responsable_id?: string
  responsable?: { id: string; nombre: string; mail: string }
  comentario_asignacion?: string; comentario_solucion?: string; tipo_ticket?: string
}

interface Props {
  tickets: TicketIT[]; totalCount: number; page: number; pageSize: number
  cuentaEstados: Record<string,number>
  filters: { estado?: string; sistema?: string; q?: string; responsable?: string }
  perfil: Perfil; responsables: { id: string; nombre: string; mail: string }[]
  ticketsPorResponsable: Record<string,number>
}

const ESTADOS = ['Recibido','Asignado','Pendiente','Resuelto']
const ESTADO_CFG: Record<string,{bg:string;color:string;dot:string}> = {
  Recibido:  { bg:'bg-slate-100',   color:'text-slate-600',   dot:'bg-slate-400'   },
  Asignado:  { bg:'bg-orange-100',  color:'text-orange-700',  dot:'bg-orange-500'  },
  Pendiente: { bg:'bg-purple-100',  color:'text-purple-700',  dot:'bg-purple-500'  },
  Resuelto:  { bg:'bg-emerald-100', color:'text-emerald-800', dot:'bg-emerald-600' },
}
const SISTEMAS = ['Tourplan','Pythagoras/Bazar','Backend B2C','Vamoos','Otro']
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']
function avatarColor(name: string) { let h=0; for (const c of name) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }
function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }
function formatFecha(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit', timeZone:'America/Argentina/Buenos_Aires' })
}

export default function TicketsITTable({ tickets, totalCount, page, pageSize, cuentaEstados, filters, perfil, responsables, ticketsPorResponsable }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<TicketIT|null>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string|null>(null)
  const [hovered, setHovered] = useState<{ticket:TicketIT;x:number;y:number}|null>(null)
  const hoverTimer = useRef<NodeJS.Timeout>()
  const originalResp = useRef<string|undefined>(undefined)
  const totalPages = Math.ceil(totalCount/pageSize)
  const basePath = '/tickets-it'

  const buildUrl = (params: Record<string,string|undefined>) => {
    const base = new URLSearchParams()
    const merged = { ...filters, page:'0', ...params }
    Object.entries(merged).forEach(([k,v]) => { if (v) base.set(k,v) })
    return basePath + '?' + base.toString()
  }

  const handleSave = async (t: TicketIT, extra: Record<string,any> = {}) => {
    setSaving(true)
    await fetch('/api/tickets-it/' + t.id, {
      method:'PATCH', headers:{ 'Content-Type':'application/json' },
      body: JSON.stringify({ ...t, ...extra }),
    })
    setSaving(false); setSelected(null); router.refresh()
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (!confirm('¿Eliminar este ticket?')) return
    setDeleteId(id)
    await fetch('/api/tickets-it/'+id, { method:'DELETE' })
    setDeleteId(null); router.refresh()
  }

  const goToPage = (p: number) => router.push(buildUrl({ page: String(p) }))

  return (
    <div className="p-8 fade-up">
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'#111827' }}>Tickets IT</h1>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            <p style={{ margin:0, fontSize:13, color:'#9ca3af' }}>{totalCount.toLocaleString()} tickets · mostrando {page*pageSize+1}–{Math.min((page+1)*pageSize,totalCount)}</p>
            <AutoRefresh />
          </div>
        </div>
        <a href="/nuevo-it" target="_blank"
          style={{ display:'flex', alignItems:'center', gap:6, background:'#e8573f', color:'white', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Form público
        </a>
      </div>

      {/* KPI chips */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {ESTADOS.map(e => {
          const cfg = ESTADO_CFG[e]; const n = cuentaEstados[e]||0
          const active = filters.estado === e
          return (
            <button key={e} onClick={() => router.push(buildUrl({ estado: active?undefined:e }))}
              className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active ? cfg.bg+' '+cfg.color+' border-current' : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)}/>{e}
              <span className="font-mono ml-0.5 opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {/* Panel responsables */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom:14 }}>
        {responsables.map(r => {
          const n = ticketsPorResponsable[r.id]||0
          const color = avatarColor(r.nombre)
          const active = filters.responsable === r.id
          return (
            <div key={r.id} onClick={() => router.push(buildUrl({ responsable: active?undefined:r.id }))}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', borderRadius:20, border:'1px solid', borderColor: active?color:'#e5e7eb', background: active?'#1f2937':'white', cursor:'pointer', fontSize:12, fontWeight:500, color: active?'white':'#4b5563' }}>
              <div style={{ width:20, height:20, borderRadius:'50%', background:color, color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{r.nombre.charAt(0)}</div>
              {r.nombre}
              {n > 0 ? <span style={{ background:color, color:'white', borderRadius:9999, padding:'1px 7px', fontSize:11, fontWeight:700 }}>{n}</span>
                     : <span style={{ color:'#d1d5db' }}>0</span>}
            </div>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display:'flex', flexWrap:'wrap', gap:10, marginBottom:14 }}>
        <div style={{ position:'relative' }}>
          <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input defaultValue={filters.q} onChange={e => { clearTimeout((window as any).__st); (window as any).__st=setTimeout(()=>router.push(buildUrl({q:e.target.value||undefined})),400) }}
            placeholder="Buscar solicitante…"
            style={{ paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8, border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none', width:220 }} />
        </div>
        <div style={{ display:'flex', borderRadius:8, border:'1px solid #e5e7eb', overflow:'hidden', background:'white' }}>
          {['Todos',...SISTEMAS].map(s => (
            <button key={s} onClick={() => router.push(buildUrl({ sistema: s==='Todos'?undefined:s }))}
              style={{ padding:'7px 10px', fontSize:12, fontWeight:500, border:'none', borderRight:'1px solid #e5e7eb', cursor:'pointer',
                background: (s==='Todos'?!filters.sistema:filters.sistema===s)?'#111827':'white',
                color: (s==='Todos'?!filters.sistema:filters.sistema===s)?'white':'#6b7280', whiteSpace:'nowrap' }}>
              {s==='Todos'?'Todos':s}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        {tickets.length===0 ? (
          <div style={{ padding:'60px 0', textAlign:'center', color:'#9ca3af', fontSize:14 }}>Sin tickets</div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ borderBottom:'1px solid #f0f0f0', background:'#f9fafb' }}>
                {['Nro','Estado','Sistema','Solicitante','Responsable','Fecha',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tickets.map((t,i) => {
                const cfg = ESTADO_CFG[t.estado]||ESTADO_CFG['Recibido']
                const resp = t.responsable
                return (
                  <tr key={t.id} onClick={() => setSelected(t)}
                    onMouseEnter={e => { const r = e.currentTarget.getBoundingClientRect(); hoverTimer.current=setTimeout(()=>setHovered({ticket:t,x:r.left,y:r.bottom}),500) }}
                    onMouseLeave={() => { clearTimeout(hoverTimer.current); setHovered(null) }}
                    style={{ borderBottom:'1px solid #f9fafb', background:i%2===0?'white':'#fafafa', cursor:'pointer' }}
                    className="hover:bg-gray-50 transition-colors">
                    <td style={{ padding:'10px 14px' }}><span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#6b7280' }}>{t.numero}</span></td>
                    <td style={{ padding:'10px 14px' }}>
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)}/>{t.estado}
                      </span>
                    </td>
                    <td style={{ padding:'10px 14px' }}>
                      <span style={{ background:'#f0f4ff', color:'#3730a3', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:600 }}>{t.sistema}</span>
                    </td>
                    <td style={{ padding:'10px 14px', color:'#374151', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{t.mail_solicitante}</td>
                    <td style={{ padding:'10px 14px' }}>
                      {resp ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:avatarColor(resp.nombre), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{resp.nombre.charAt(0)}</div>
                          <span>{resp.nombre}</span>
                        </div>
                      ) : <span style={{ color:'#d1d5db', fontSize:12 }}>Sin asignar</span>}
                    </td>
                    <td style={{ padding:'10px 14px', color:'#9ca3af', fontSize:12, whiteSpace:'nowrap' }}>{formatFecha(t.created_at)}</td>
                    <td style={{ padding:'10px 14px' }}>
                      <button onClick={e => handleDelete(t.id,e)} disabled={deleteId===t.id}
                        style={{ background:'none', border:'none', cursor:'pointer', color:'#d1d5db', padding:'4px', borderRadius:6, lineHeight:1 }}
                        className="hover:text-red-400 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginTop:14 }}>
          <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>Página {page+1} de {totalPages}</p>
          <div style={{ display:'flex', gap:4 }}>
            <button onClick={() => goToPage(0)} disabled={page===0} style={{ padding:'6px 10px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page===0?0.3:1 }}>«</button>
            <button onClick={() => goToPage(page-1)} disabled={page===0} style={{ padding:'6px 12px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page===0?0.3:1 }}>‹ Anterior</button>
            <button onClick={() => goToPage(page+1)} disabled={page>=totalPages-1} style={{ padding:'6px 12px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page>=totalPages-1?0.3:1 }}>Siguiente ›</button>
            <button onClick={() => goToPage(totalPages-1)} disabled={page>=totalPages-1} style={{ padding:'6px 10px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page>=totalPages-1?0.3:1 }}>»</button>
          </div>
        </div>
      )}

      {/* Tooltip hover */}
      {hovered && (
        <div style={{ position:'fixed', left:Math.min(hovered.x+8,window.innerWidth-340), top:hovered.y+6, zIndex:8000, width:320, background:'white', border:'1px solid #e5e7eb', borderRadius:12, boxShadow:'0 8px 32px rgba(0,0,0,0.14)', padding:'14px 16px', pointerEvents:'none' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <span style={{ fontFamily:'monospace', fontSize:12, fontWeight:700, color:'#6b7280', background:'#f3f4f6', padding:'2px 7px', borderRadius:5 }}>{hovered.ticket.numero}</span>
            <span style={{ background:'#f0f4ff', color:'#3730a3', borderRadius:6, padding:'2px 8px', fontSize:11, fontWeight:600 }}>{hovered.ticket.sistema}</span>
          </div>
          <p style={{ margin:'0 0 8px', fontSize:13, color:'#374151', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:3, WebkitBoxOrient:'vertical', overflow:'hidden', whiteSpace:'pre-wrap' }}>{hovered.ticket.descripcion}</p>
          <div style={{ fontSize:11, color:'#9ca3af', display:'flex', justifyContent:'space-between' }}>
            <span>{hovered.ticket.mail_solicitante}</span>
            <span style={{ background:'#f9fafb', border:'1px solid #f0f0f0', borderRadius:6, padding:'2px 8px' }}>Click para editar →</span>
          </div>
        </div>
      )}

      {/* Modal */}
      {selected && (
        <TicketITModal ticket={selected} responsables={responsables} perfil={perfil} saving={saving}
          onClose={() => setSelected(null)} onSave={handleSave} />
      )}
    </div>
  )
}

function TicketITModal({ ticket, responsables, perfil, saving, onClose, onSave }: {
  ticket: TicketIT; responsables: {id:string;nombre:string;mail:string}[]; perfil: Perfil
  saving: boolean; onClose: ()=>void; onSave: (t:TicketIT, extra?:Record<string,any>)=>void
}) {
  const [form, setForm] = useState({...ticket})
  const set = (k: keyof TicketIT) => (e: React.ChangeEvent<HTMLSelectElement|HTMLTextAreaElement|HTMLInputElement>) =>
    setForm(f => ({...f, [k]: e.target.value}))

  const wasNotResuelto = ticket.estado !== 'Resuelto'
  const nowResuelto = form.estado === 'Resuelto'

  const row = (l: string, v?: string) => v ? (
    <div key={l}>
      <p style={{ margin:'0 0 2px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>{l}</p>
      <p style={{ margin:0, fontSize:13, color:'#374151' }}>{v}</p>
    </div>
  ) : null

  const handleSave = () => {
    const resp = responsables.find(r => r.id === form.responsable_id)
    onSave(form, {
      prevResponsableId: ticket.responsable_id,
      responsable_mail: resp?.mail||null,
      responsable_nombre: resp?.nombre||null,
      sendMail: wasNotResuelto && nowResuelto,
    })
  }

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:16, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', marginBottom:40 }}>
        {/* Header */}
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <span style={{ fontFamily:'monospace', fontSize:13, fontWeight:700, color:'#6b7280', background:'#f3f4f6', padding:'2px 8px', borderRadius:6 }}>{ticket.numero}</span>
              <span style={{ background:'#f0f4ff', color:'#3730a3', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:600 }}>{ticket.sistema}</span>
            </div>
            <p style={{ margin:0, fontSize:13, color:'#9ca3af' }}>Enviado por <strong style={{ color:'#374151' }}>{ticket.mail_solicitante}</strong></p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20 }}>×</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          {/* Datos del ticket */}
          <div style={{ background:'#f9fafb', borderRadius:10, padding:14, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px 16px' }}>
            {row('Sistema', ticket.sistema)}
            {row('Módulo TP', ticket.modulo_tourplan)}
            {row('Módulo Pythagoras', ticket.modulo_pythagoras)}
            {row('Módulo B2C', ticket.modulo_b2c)}
            {row('Código File', ticket.codigo_file)}
            {row('Nro. Voucher', ticket.nro_voucher)}
            {row('Cód. Cliente/Proveedor', ticket.codigo_cliente_proveedor)}
            {row('Cód. Producto', ticket.codigo_producto)}
            {row('Cód. File TP', ticket.codigo_file_tourplan)}
            {row('Cód. File Pythagoras', ticket.codigo_file_pythagoras)}
            {row('Link Itinerario', ticket.link_itinerario)}
          </div>

          {/* Descripción */}
          <div style={{ background:'#f9fafb', borderRadius:10, padding:14 }}>
            <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>Descripción</p>
            <p style={{ margin:0, fontSize:13, color:'#374151', lineHeight:1.6, whiteSpace:'pre-wrap' }}>{ticket.descripcion}</p>
          </div>

          {ticket.imagen_url && (
            <a href={ticket.imagen_url} target="_blank" rel="noopener noreferrer" style={{ fontSize:13, color:'#4f6ef7' }}>Ver adjunto →</a>
          )}

          <hr style={{ border:'none', borderTop:'1px solid #f0f0f0' }}/>

          {/* Gestión */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:6, textTransform:'uppercase' }}>Estado</label>
              <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                {['Recibido','Asignado','Pendiente','Resuelto'].map(e => {
                  const cfg = (ESTADO_CFG as any)[e]; const active = form.estado===e
                  return (
                    <button key={e} onClick={() => setForm(f=>({...f,estado:e}))}
                      className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        active ? cfg.bg+' '+cfg.color+' border-current' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      )}>
                      <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)}/>{e}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:6, textTransform:'uppercase' }}>Responsable</label>
              <select value={form.responsable_id||''} onChange={set('responsable_id')}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', background:'white' }}>
                <option value="">Sin asignar</option>
                {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:6, textTransform:'uppercase' }}>Comentario asignación</label>
              <textarea value={form.comentario_asignacion||''} onChange={set('comentario_asignacion')} rows={2}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
            </div>
            {nowResuelto && (
              <div>
                <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#16a34a', marginBottom:6, textTransform:'uppercase' }}>Comentario de resolución *</label>
                <textarea value={form.comentario_solucion||''} onChange={set('comentario_solucion')} rows={2}
                  style={{ width:'100%', border:'1px solid #bbf7d0', borderRadius:8, padding:'8px 12px', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box', background:'#f0fdf4' }}
                  placeholder="Se enviará al solicitante…"/>
              </div>
            )}
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'8px 18px', fontSize:13, borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer' }}>Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            style={{ padding:'8px 24px', fontSize:13, fontWeight:600, borderRadius:8, border:'none', background:saving?'#9ca3af':'#4f6ef7', color:'white', cursor:saving?'not-allowed':'pointer' }}>
            {saving?'Guardando…':'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}

const ESTADO_CFG: Record<string,{bg:string;color:string;dot:string}> = {
  Recibido:  { bg:'bg-slate-100',   color:'text-slate-600',   dot:'bg-slate-400'   },
  Asignado:  { bg:'bg-orange-100',  color:'text-orange-700',  dot:'bg-orange-500'  },
  Pendiente: { bg:'bg-purple-100',  color:'text-purple-700',  dot:'bg-purple-500'  },
  Resuelto:  { bg:'bg-emerald-100', color:'text-emerald-800', dot:'bg-emerald-600' },
}
