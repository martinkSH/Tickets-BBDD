'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Perfil } from '@/lib/types'
import AutoRefresh from './AutoRefresh'

interface Cliente {
  id: string
  mail_contacto: string
  tipo_cliente: string
  nombre_madre?: string
  nombre_fantasia: string
  direccion?: string
  razon_social: string
  nombre_contacto?: string
  mail_telefono?: string
  contacto_interno?: string
  sitio_web?: string
  logo_url?: string
  categoria?: string
  estado: string
  responsable_id?: string
  responsable?: { id: string; nombre: string; mail: string }
  comentario?: string
  created_at: string
}

interface Props {
  clientes: Cliente[]
  totalCount: number
  page: number
  pageSize: number
  cuentaEstados: Record<string, number>
  filters: { estado?: string; tipo?: string; q?: string }
  perfil: Perfil
  responsables: { id: string; nombre: string; mail: string }[]
}

const ESTADOS = ['Pendiente','Asignado','Cargado']
const ESTADO_CFG: Record<string,{bg:string;color:string;dot:string}> = {
  Pendiente: { bg:'bg-amber-100',   color:'text-amber-800',   dot:'bg-amber-400'   },
  Asignado:  { bg:'bg-blue-100',    color:'text-blue-800',    dot:'bg-blue-500'    },
  Cargado:   { bg:'bg-emerald-100', color:'text-emerald-800', dot:'bg-emerald-500' },
}
const CAT_COLORS: Record<string,string> = { A:'#16a34a', B:'#2563eb', C:'#d97706', D:'#dc2626' }
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']
function avatarColor(name: string) { let h=0; for (const c of name) h=(h*31+c.charCodeAt(0))%AVATAR_COLORS.length; return AVATAR_COLORS[h] }
function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }
function formatFecha(iso?: string) { if (!iso) return '—'; return new Date(iso).toLocaleDateString('es-AR', { day:'2-digit', month:'2-digit', year:'numeric', timeZone:'America/Argentina/Buenos_Aires' }) }

export default function ClientesTable({ clientes, totalCount, page, pageSize, cuentaEstados, filters, perfil, responsables }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Cliente|null>(null)
  const [saving, setSaving] = useState(false)
  const originalResp = useRef<string|undefined>(undefined)
  const totalPages = Math.ceil(totalCount/pageSize)

  const buildUrl = (params: Record<string,string|undefined>) => {
    const base = new URLSearchParams()
    const merged = { ...filters, page:'0', ...params }
    Object.entries(merged).forEach(([k,v]) => { if (v) base.set(k,v) })
    return '/clientes?' + base.toString()
  }

  const handleSave = async (c: Cliente) => {
    setSaving(true)
    const resp = responsables.find(r => r.id === c.responsable_id)
    await fetch('/api/clientes/' + c.id, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ estado: c.estado, responsable_id: c.responsable_id||null, comentario: c.comentario,
        prevResponsableId: originalResp.current, responsable_mail: resp?.mail||null, responsable_nombre: resp?.nombre||null }),
    })
    setSaving(false); setSelected(null); router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar este cliente?')) return
    await fetch('/api/clientes/'+id, { method:'DELETE' })
    router.refresh()
  }

  return (
    <div style={{ padding: 32 }}>
      <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:24 }}>
        <div>
          <h1 style={{ margin:0, fontSize:24, fontWeight:700, color:'#111827' }}>Alta de Clientes</h1>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4 }}>
            <p style={{ margin:0, fontSize:13, color:'#9ca3af' }}>{totalCount} solicitudes</p>
            <AutoRefresh />
          </div>
        </div>
        <a href="/alta-cliente" target="_blank"
          style={{ display:'flex', alignItems:'center', gap:6, background:'#e8573f', color:'white', borderRadius:8, padding:'8px 16px', fontSize:13, fontWeight:600, textDecoration:'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ver form público
        </a>
      </div>

      {/* Filtros estado */}
      <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
        {['Todos',...ESTADOS].map(e => {
          const cfg = ESTADO_CFG[e]
          const n = e==='Todos' ? totalCount : (cuentaEstados[e]||0)
          const active = e==='Todos' ? !filters.estado : filters.estado===e
          return (
            <button key={e} onClick={() => router.push(buildUrl({ estado: e==='Todos'?undefined:e }))}
              className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active ? (cfg ? cfg.bg+' '+cfg.color+' border-current' : 'bg-gray-900 text-white border-gray-900') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              {cfg && <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)}/>}
              {e} <span className="font-mono ml-0.5 opacity-60">{n}</span>
            </button>
          )
        })}
        <div style={{ display:'flex', gap:6, marginLeft:8 }}>
          {['Todos','Madre','Consumidor Final'].map(t => (
            <button key={t} onClick={() => router.push(buildUrl({ tipo: t==='Todos'?undefined:t }))}
              style={{ padding:'6px 12px', fontSize:12, borderRadius:20, border:'1px solid',
                borderColor: (t==='Todos'?!filters.tipo:filters.tipo===t) ? '#4f6ef7':'#e5e7eb',
                background: (t==='Todos'?!filters.tipo:filters.tipo===t) ? '#eff6ff':'white',
                color: (t==='Todos'?!filters.tipo:filters.tipo===t) ? '#2563eb':'#6b7280', cursor:'pointer' }}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom:16, position:'relative', display:'inline-block' }}>
        <svg style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input defaultValue={filters.q}
          onChange={e => { clearTimeout((window as any).__st); (window as any).__st=setTimeout(()=>router.push(buildUrl({q:e.target.value||undefined})),400) }}
          placeholder="Buscar razón social…"
          style={{ paddingLeft:32, paddingRight:12, paddingTop:8, paddingBottom:8, border:'1px solid #e5e7eb', borderRadius:8, fontSize:13, outline:'none', width:260 }}/>
      </div>

      {/* Tabla */}
      <div style={{ background:'white', borderRadius:12, border:'1px solid #e5e7eb', overflow:'hidden' }}>
        {clientes.length===0 ? (
          <p style={{ padding:60, textAlign:'center', color:'#9ca3af', fontSize:14 }}>Sin solicitudes</p>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr style={{ background:'#f9fafb', borderBottom:'1px solid #f0f0f0' }}>
                {['Razón Social','Tipo','Cat.','Estado','Responsable','Fecha',''].map(h => (
                  <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'#6b7280', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {clientes.map((c,i) => {
                const cfg = ESTADO_CFG[c.estado]||ESTADO_CFG['Pendiente']
                const resp = c.responsable
                return (
                  <tr key={c.id} style={{ borderBottom:'1px solid #f9fafb', background: i%2===0?'white':'#fafafa' }}>
                    <td style={{ padding:'11px 14px' }}>
                      <p style={{ margin:0, fontWeight:600, color:'#111827' }}>{c.razon_social}</p>
                      <p style={{ margin:'2px 0 0', fontSize:12, color:'#9ca3af' }}>{c.nombre_fantasia}</p>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <span style={{ background:'#f3f4f6', borderRadius:6, padding:'2px 8px', fontSize:12, fontWeight:600, color:'#374151', whiteSpace:'nowrap' }}>{c.tipo_cliente}</span>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      {c.categoria && <span style={{ background:CAT_COLORS[c.categoria]+'22', color:CAT_COLORS[c.categoria], borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>{c.categoria}</span>}
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)}/>{c.estado}
                      </span>
                    </td>
                    <td style={{ padding:'11px 14px' }}>
                      {resp ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          <div style={{ width:22, height:22, borderRadius:'50%', background:avatarColor(resp.nombre), color:'white', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:700 }}>{resp.nombre.charAt(0)}</div>
                          <span style={{ color:'#374151' }}>{resp.nombre}</span>
                        </div>
                      ) : <span style={{ color:'#d1d5db', fontSize:12 }}>Sin asignar</span>}
                    </td>
                    <td style={{ padding:'11px 14px', color:'#9ca3af', fontSize:12 }}>{formatFecha(c.created_at)}</td>
                    <td style={{ padding:'11px 14px' }}>
                      <div style={{ display:'flex', gap:4 }}>
                        <button onClick={() => { originalResp.current=c.responsable_id; setSelected({...c}) }}
                          style={{ padding:'4px 6px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', color:'#6b7280', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(c.id)}
                          style={{ padding:'4px 6px', borderRadius:6, border:'1px solid #e5e7eb', background:'white', color:'#d1d5db', cursor:'pointer', display:'flex', alignItems:'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {totalPages>1 && (
        <div style={{ display:'flex', justifyContent:'flex-end', gap:4, marginTop:14 }}>
          <button onClick={() => router.push(buildUrl({page:String(page-1)}))} disabled={page===0}
            style={{ padding:'6px 12px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page===0?0.3:1 }}>Anterior</button>
          <button onClick={() => router.push(buildUrl({page:String(page+1)}))} disabled={page>=totalPages-1}
            style={{ padding:'6px 12px', fontSize:12, borderRadius:6, border:'1px solid #e5e7eb', background:'white', cursor:'pointer', opacity:page>=totalPages-1?0.3:1 }}>Siguiente</button>
        </div>
      )}

      {selected && (
        <ClienteModal proveedor={selected} responsables={responsables} saving={saving}
          onClose={() => setSelected(null)} onSave={handleSave} onChange={setSelected} />
      )}
    </div>
  )
}

function ClienteModal({ proveedor: c, responsables, saving, onClose, onSave, onChange }: {
  proveedor: Cliente; responsables: {id:string;nombre:string;mail:string}[]; saving:boolean
  onClose:()=>void; onSave:(c:Cliente)=>void; onChange:(c:Cliente)=>void
}) {
  const catColor = CAT_COLORS[c.categoria||''] || '#6b7280'
  const set = (k: keyof Cliente) => (e: React.ChangeEvent<HTMLInputElement|HTMLSelectElement|HTMLTextAreaElement>) =>
    onChange({ ...c, [k]: e.target.value })

  const row = (label: string, value?: string) => value ? (
    <div key={label}>
      <p style={{ margin:'0 0 2px', fontSize:10, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>{label}</p>
      <p style={{ margin:0, fontSize:13, color:'#374151' }}>{value}</p>
    </div>
  ) : null

  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.4)', backdropFilter:'blur(2px)', zIndex:9999, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'40px 16px', overflowY:'auto' }}>
      <div onClick={e=>e.stopPropagation()} style={{ background:'white', borderRadius:16, width:'100%', maxWidth:680, boxShadow:'0 20px 60px rgba(0,0,0,0.2)', marginBottom:40 }}>
        <div style={{ padding:'18px 24px', borderBottom:'1px solid #f0f0f0', display:'flex', alignItems:'flex-start', justifyContent:'space-between' }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4 }}>
              <h2 style={{ margin:0, fontSize:17, fontWeight:700 }}>{c.razon_social}</h2>
              {c.categoria && <span style={{ background:catColor+'22', color:catColor, borderRadius:20, padding:'2px 10px', fontSize:12, fontWeight:700 }}>Cat. {c.categoria}</span>}
              <span style={{ background:'#f3f4f6', borderRadius:6, padding:'2px 8px', fontSize:11, color:'#6b7280' }}>{c.tipo_cliente}</span>
            </div>
            <p style={{ margin:0, fontSize:12, color:'#9ca3af' }}>{c.nombre_fantasia} · {c.mail_contacto}</p>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#9ca3af', fontSize:20 }}>×</button>
        </div>

        <div style={{ padding:'20px 24px', display:'flex', flexDirection:'column', gap:16 }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px 20px', background:'#f9fafb', borderRadius:10, padding:16 }}>
            {row('Nombre Fantasía', c.nombre_fantasia)}
            {c.nombre_madre && row('Cliente Madre', c.nombre_madre)}
            {row('Dirección', c.direccion)}
            {row('Nombre contacto', c.nombre_contacto)}
            {row('Mail/Tel contacto', c.mail_telefono)}
            {row('Contacto interno', c.contacto_interno)}
            {row('Sitio web', c.sitio_web)}
          </div>
          {c.logo_url && (
            <div>
              <p style={{ margin:'0 0 6px', fontSize:11, fontWeight:700, color:'#9ca3af', textTransform:'uppercase' }}>Logo</p>
              <img src={c.logo_url} alt="Logo" style={{ maxHeight:60, maxWidth:200, objectFit:'contain', border:'1px solid #e5e7eb', borderRadius:6, padding:4 }} />
            </div>
          )}

          <hr style={{ border:'none', borderTop:'1px solid #f0f0f0' }}/>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5, textTransform:'uppercase' }}>Estado</label>
              <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                {ESTADOS.map(e => {
                  const cfg = ESTADO_CFG[e]; const active = c.estado===e
                  return (
                    <button key={e} onClick={() => onChange({...c, estado:e})}
                      className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        active ? cfg.bg+' '+cfg.color+' border-current' : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      )}>
                      <span className={cx('w-1.5 h-1.5 rounded-full',cfg.dot)}/>{e}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5, textTransform:'uppercase' }}>Responsable</label>
              <select value={c.responsable_id||''} onChange={set('responsable_id')}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, outline:'none', background:'white' }}>
                <option value="">Sin asignar</option>
                {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:'1/-1' }}>
              <label style={{ display:'block', fontSize:12, fontWeight:600, color:'#6b7280', marginBottom:5, textTransform:'uppercase' }}>Comentario interno</label>
              <textarea value={c.comentario||''} onChange={set('comentario')} rows={2}
                style={{ width:'100%', border:'1px solid #e5e7eb', borderRadius:8, padding:'8px 12px', fontSize:13, resize:'vertical', outline:'none', fontFamily:'inherit', boxSizing:'border-box' }}/>
            </div>
          </div>
        </div>

        <div style={{ padding:'14px 24px', borderTop:'1px solid #f0f0f0', display:'flex', justifyContent:'flex-end', gap:8 }}>
          <button onClick={onClose} style={{ padding:'8px 18px', fontSize:13, borderRadius:8, border:'1px solid #e5e7eb', background:'white', cursor:'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(c)} disabled={saving}
            style={{ padding:'8px 24px', fontSize:13, fontWeight:600, borderRadius:8, border:'none', background:saving?'#9ca3af':'#4f6ef7', color:'white', cursor:saving?'not-allowed':'pointer' }}>
            {saving?'Guardando…':'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
