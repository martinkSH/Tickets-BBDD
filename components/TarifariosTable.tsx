'use client'

import { useState, useMemo, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Perfil } from '@/lib/types'
import AutoRefresh from './AutoRefresh'

interface Tarifario {
  id: string
  proveedor: string
  destino?: string
  pais?: string
  prioridad?: string
  estado: string
  cargo_por?: string
  fecha_carga?: string
  nota_rapida?: string
  nota_larga?: string
  link?: string
  fecha_envio?: string
  created_at: string
}

interface Responsable {
  id: string
  nombre: string
  mail: string
}

interface Props {
  tarifarios: Tarifario[]
  totalCount: number
  page: number
  pageSize: number
  cuentaEstados: Record<string, number>
  filters: { estado?: string; prioridad?: string; pais?: string; q?: string }
  perfil: Perfil
  responsables: Responsable[]
}

const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

const ESTADOS = ['Pendiente', 'En Proceso', 'Cargado', 'No Cargar']
const PRIORIDADES = ['ALTA', 'MEDIA', 'BAJA']
const PAISES = ['ARG', 'EXT']

const ESTADO_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  'Pendiente':   { bg: 'bg-slate-100',   color: 'text-slate-600',   dot: 'bg-slate-400'   },
  'En Proceso':  { bg: 'bg-amber-100',   color: 'text-amber-700',   dot: 'bg-amber-500'   },
  'Cargado':     { bg: 'bg-emerald-100', color: 'text-emerald-800', dot: 'bg-emerald-500' },
  'No Cargar':   { bg: 'bg-red-100',     color: 'text-red-700',     dot: 'bg-red-400'     },
}
const PRIO_CFG: Record<string, { badge: string }> = {
  'ALTA':  { badge: 'bg-red-100 text-red-700'    },
  'MEDIA': { badge: 'bg-amber-100 text-amber-700' },
  'BAJA':  { badge: 'bg-green-100 text-green-700' },
}

function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }

export default function TarifariosTable({ tarifarios, totalCount, page, pageSize, cuentaEstados, filters, perfil, responsables }: Props) {
  const router = useRouter()
  const [editing, setEditing] = useState<Tarifario | null>(null)
  const [saving, setSaving] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const originalCargoPor = useRef<string | undefined>(undefined)
  const [busqueda, setBusqueda] = useState(filters.q || '')
  const searchTimer = useRef<NodeJS.Timeout>()
  const totalPages = Math.ceil(totalCount / pageSize)

  const buildUrl = (params: Record<string, string | undefined>) => {
    const base = new URLSearchParams()
    const merged = { page: '0', ...filters, ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) base.set(k, v) })
    return `/tarifarios?${base.toString()}`
  }

  const handleFilter = (key: string, val: string | undefined) => {
    router.push(buildUrl({ [key]: val, page: '0' }))
  }

  const handleSearch = (q: string) => {
    setBusqueda(q)
    clearTimeout(searchTimer.current)
    searchTimer.current = setTimeout(() => {
      router.push(buildUrl({ q: q || undefined, page: '0' }))
    }, 400)
  }

  const handleSave = async (t: Tarifario, sendMail = false) => {
    setSaving(true)
    const wasNotCargado = editing?.estado !== 'Cargado'
    const nowCargado = t.estado === 'Cargado'
    const prevCargoPor = originalCargoPor.current
    // Buscar mail del responsable asignado
    const resp = responsables.find(r => r.nombre === t.cargo_por)
    await fetch(`/api/tarifarios/${t.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...t,
        sendMail: sendMail && wasNotCargado && nowCargado,
        prevCargoPor,
        responsable_mail: resp?.mail || null,
        responsable_nombre: resp?.nombre || t.cargo_por,
      }),
    })
    setSaving(false)
    setEditing(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este tarifario?')) return
    await fetch(`/api/tarifarios/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  const formatFecha = (iso?: string) => {
    if (!iso) return '—'
    return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'America/Argentina/Buenos_Aires' })
  }

  return (
    <div style={{ padding: '32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Carga Tarifarios</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>
              {totalCount.toLocaleString()} tarifarios · mostrando {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)}
            </p>
            <AutoRefresh />
          </div>
        </div>
        <button onClick={() => setShowNew(true)}
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 4v16m8-8H4"/></svg>
          Nuevo tarifario
        </button>
      </div>

      {/* KPI chips de estado */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
        {['Todos', ...ESTADOS].map(e => {
          const cfg = ESTADO_CFG[e]
          const count = e === 'Todos' ? totalCount : (cuentaEstados[e] || 0)
          const active = e === 'Todos' ? !filters.estado : filters.estado === e
          return (
            <button key={e} onClick={() => handleFilter('estado', e === 'Todos' ? undefined : e)}
              className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active ? (cfg ? `${cfg.bg} ${cfg.color} border-current` : 'bg-gray-900 text-white border-gray-900') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              {cfg && <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />}
              {e} <span className="font-mono ml-0.5 opacity-60">{count}</span>
            </button>
          )
        })}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        {/* Búsqueda */}
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={e => handleSearch(e.target.value)}
            placeholder="Buscar proveedor…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 }} />
        </div>

        {/* Prioridad */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', background: 'white' }}>
          {['Todas', ...PRIORIDADES].map(p => (
            <button key={p} onClick={() => handleFilter('prioridad', p === 'Todas' ? undefined : p)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRight: '1px solid #e5e7eb', cursor: 'pointer',
                background: (p === 'Todas' ? !filters.prioridad : filters.prioridad === p) ? '#111827' : 'white',
                color: (p === 'Todas' ? !filters.prioridad : filters.prioridad === p) ? 'white' : '#6b7280',
              }}>
              {p}
            </button>
          ))}
        </div>

        {/* País */}
        <div style={{ display: 'flex', borderRadius: 8, border: '1px solid #e5e7eb', overflow: 'hidden', background: 'white' }}>
          {['Todos', ...PAISES].map(p => (
            <button key={p} onClick={() => handleFilter('pais', p === 'Todos' ? undefined : p)}
              style={{
                padding: '7px 12px', fontSize: 12, fontWeight: 500, border: 'none', borderRight: '1px solid #e5e7eb', cursor: 'pointer',
                background: (p === 'Todos' ? !filters.pais : filters.pais === p) ? '#111827' : 'white',
                color: (p === 'Todos' ? !filters.pais : filters.pais === p) ? 'white' : '#6b7280',
              }}>
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {tarifarios.length === 0 ? (
          <p style={{ padding: '60px 0', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Sin tarifarios que coincidan</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #f0f0f0', background: '#f9fafb' }}>
                {['Proveedor','Destino','País','Prioridad','Estado','Cargó','Fecha carga','Notas','Mail',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tarifarios.map((t, i) => {
                const cfg = ESTADO_CFG[t.estado] || ESTADO_CFG['Pendiente']
                const prioCfg = PRIO_CFG[t.prioridad || '']
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827', maxWidth: 180, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.proveedor}</td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{t.destino || '—'}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {t.pais ? <span style={{ background: t.pais === 'ARG' ? '#dbeafe' : '#f3e8ff', color: t.pais === 'ARG' ? '#1d4ed8' : '#7c3aed', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontWeight: 700 }}>{t.pais}</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {prioCfg ? <span className={cx('px-2 py-0.5 rounded text-xs font-medium', prioCfg.badge)}>{t.prioridad}</span> : '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />
                        {t.estado}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {t.cargo_por ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(t.cargo_por), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700, flexShrink: 0 }}>
                            {t.cargo_por.charAt(0)}
                          </div>
                          <span style={{ fontSize: 13, color: '#374151' }}>{t.cargo_por}</span>
                        </div>
                      ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>Sin asignar</span>}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{formatFecha(t.fecha_carga)}</td>
                    <td style={{ padding: '10px 14px', maxWidth: 160 }}>
                      {t.nota_rapida && <p style={{ margin: 0, fontSize: 12, color: '#374151', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.nota_rapida}>{t.nota_rapida}</p>}
                      {t.nota_larga && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={t.nota_larga}>{t.nota_larga}</p>}
                      {!t.nota_rapida && !t.nota_larga && '—'}
                    </td>
                    <td style={{ padding: '10px 14px' }}>
                      {t.fecha_envio
                        ? <span title={`Enviado: ${formatFecha(t.fecha_envio)}`} style={{ color: '#16a34a', fontSize: 16 }}>✓</span>
                        : <span style={{ color: '#d1d5db', fontSize: 12 }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        {t.link && (
                          <a href={t.link} target="_blank" rel="noopener noreferrer"
                            style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', color: '#6b7280', display: 'flex', alignItems: 'center' }}
                            title="Ver tarifario">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
                          </a>
                        )}
                        <button onClick={() => { originalCargoPor.current = t.cargo_por; setEditing({ ...t }) }} title="Editar"
                          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(t.id)} title="Eliminar"
                          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }}>
          <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>Página {page + 1} de {totalPages}</p>
          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={() => router.push(buildUrl({ page: '0' }))} disabled={page === 0}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page === 0 ? 0.3 : 1 }}>«</button>
            <button onClick={() => router.push(buildUrl({ page: String(page - 1) }))} disabled={page === 0}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page === 0 ? 0.3 : 1 }}>‹ Anterior</button>
            <button onClick={() => router.push(buildUrl({ page: String(page + 1) }))} disabled={page >= totalPages - 1}
              style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1 }}>Siguiente ›</button>
            <button onClick={() => router.push(buildUrl({ page: String(totalPages - 1) }))} disabled={page >= totalPages - 1}
              style={{ padding: '6px 10px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1 }}>»</button>
          </div>
        </div>
      )}

      {/* Modal edición / nuevo */}
      {(editing || showNew) && (
        <TarifarioModal
          tarifario={editing}
          perfil={perfil}
          saving={saving}
          responsables={responsables}
          onClose={() => { setEditing(null); setShowNew(false) }}
          onSave={handleSave}
          onSaveAndMail={(t) => handleSave(t, true)}
        />
      )}
    </div>
  )
}

// ── Modal ──────────────────────────────────────────────────────────────────
function TarifarioModal({ tarifario, perfil, saving, responsables, onClose, onSave, onSaveAndMail }: {
  tarifario: Tarifario | null
  perfil: Perfil
  saving: boolean
  responsables: Responsable[]
  onClose: () => void
  onSave: (t: Tarifario) => void
  onSaveAndMail: (t: Tarifario) => void
}) {
  const isNew = !tarifario
  const [form, setForm] = useState<Partial<Tarifario>>(tarifario || {
    proveedor: '', destino: '', pais: 'ARG', prioridad: 'ALTA',
    estado: 'Pendiente', cargo_por: perfil.nombre, nota_rapida: '', nota_larga: '', link: '',
  })
  const set = (k: keyof Tarifario) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  const wasNotCargado = !tarifario || tarifario.estado !== 'Cargado'
  const nowCargado = form.estado === 'Cargado'
  const showMailBtn = wasNotCargado && nowCargado

  const handleNew = async () => {
    const res = await fetch('/api/tarifarios', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    })
    const data = await res.json()
    if (data.ok) { onClose(); window.location.reload() }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', border: '1px solid #e5e7eb', borderRadius: 8,
    padding: '8px 12px', fontSize: 13, outline: 'none', boxSizing: 'border-box',
    fontFamily: 'inherit',
  }
  const labelStyle: React.CSSProperties = { display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.04em' }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 620, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0, fontSize: 16, fontWeight: 700 }}>{isNew ? 'Nuevo tarifario' : `Editar — ${tarifario?.proveedor}`}</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>×</button>
        </div>
        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Proveedor *</label>
              <input value={form.proveedor || ''} onChange={set('proveedor')} style={inputStyle} placeholder="Nombre del proveedor" />
            </div>
            <div>
              <label style={labelStyle}>Destino</label>
              <input value={form.destino || ''} onChange={set('destino')} style={inputStyle} placeholder="BUE, USH, MDZ…" />
            </div>
            <div>
              <label style={labelStyle}>País</label>
              <select value={form.pais || ''} onChange={set('pais')} style={inputStyle}>
                <option value="">—</option>
                {PAISES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Prioridad</label>
              <select value={form.prioridad || ''} onChange={set('prioridad')} style={inputStyle}>
                <option value="">—</option>
                {PRIORIDADES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Estado</label>
              <select value={form.estado || 'Pendiente'} onChange={set('estado')} style={inputStyle}>
                {['Pendiente', 'En Proceso', 'Cargado', 'No Cargar'].map(e => <option key={e} value={e}>{e}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>Responsable de carga</label>
              <select value={form.cargo_por || ''} onChange={set('cargo_por')} style={inputStyle}>
                <option value="">Sin asignar</option>
                {responsables.map(r => <option key={r.id} value={r.nombre}>{r.nombre}</option>)}
              </select>
              {form.cargo_por && form.cargo_por !== tarifario?.cargo_por && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#2563eb' }}>✉ Se enviará aviso por mail a {form.cargo_por}</p>
              )}
            </div>
            <div>
              <label style={labelStyle}>Nota rápida</label>
              <input value={form.nota_rapida || ''} onChange={set('nota_rapida')} style={inputStyle} placeholder="Resumen breve" />
            </div>
            <div>
              <label style={labelStyle}>Link tarifario</label>
              <input value={form.link || ''} onChange={set('link')} style={inputStyle} placeholder="https://…" />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={labelStyle}>Notas de carga</label>
              <textarea value={form.nota_larga || ''} onChange={set('nota_larga')} rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} placeholder="Detalles adicionales…" />
            </div>
          </div>

          {showMailBtn && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: '#166534' }}>
              📬 Se marcó como <strong>Cargado</strong> — podés guardar enviando el aviso por mail a los destinatarios configurados.
            </div>
          )}
        </div>
        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Cancelar</button>
          {isNew ? (
            <button onClick={handleNew} disabled={!form.proveedor}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: !form.proveedor ? '#9ca3af' : '#4f6ef7', color: 'white', cursor: !form.proveedor ? 'not-allowed' : 'pointer' }}>
              Crear
            </button>
          ) : (<>
            {showMailBtn && (
              <button onClick={() => onSaveAndMail(form as Tarifario)} disabled={saving}
                style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: '#16a34a', color: 'white', cursor: 'pointer' }}>
                {saving ? 'Guardando…' : '✉ Guardar y enviar aviso'}
              </button>
            )}
            <button onClick={() => onSave(form as Tarifario)} disabled={saving}
              style={{ padding: '8px 20px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: saving ? '#9ca3af' : '#4f6ef7', color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Guardando…' : 'Guardar'}
            </button>
          </>)}
        </div>
      </div>
    </div>
  )
}
