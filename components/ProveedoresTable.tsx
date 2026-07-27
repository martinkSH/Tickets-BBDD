'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import type { Perfil } from '@/lib/types'
import AutoRefresh from './AutoRefresh'

interface Proveedor {
  id: string
  mail_contacto: string
  razon_social: string
  nombre_fantasia?: string
  domicilio?: string
  ciudad?: string
  pais?: string
  telefono?: string
  cuit?: string
  condicion_impositiva?: string
  forma_pago?: string
  moneda_pago?: string
  termino_pago?: string
  datos_bancarios?: string
  mail_pagos?: string
  contacto_admin?: string
  contacto_comercial?: string
  contacto_reservas?: string
  telefono_emergencias?: string
  estado: string
  responsable_id?: string
  responsable?: { id: string; nombre: string; mail: string }
  comentario?: string
  servicios?: string[]
  created_at: string
}

interface Props {
  proveedores: Proveedor[]
  totalCount: number
  page: number
  pageSize: number
  cuentaEstados: Record<string, number>
  filters: { estado?: string; q?: string }
  perfil: Perfil
  responsables: { id: string; nombre: string; mail: string }[]
}

const ESTADOS = ['Pendiente', 'Asignado', 'Cargado']
const ESTADO_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  Pendiente: { bg: 'bg-amber-100',   color: 'text-amber-800',   dot: 'bg-amber-400'   },
  Asignado:  { bg: 'bg-blue-100',    color: 'text-blue-800',    dot: 'bg-blue-500'    },
  Cargado:   { bg: 'bg-emerald-100', color: 'text-emerald-800', dot: 'bg-emerald-500' },
}
const AVATAR_COLORS = ['#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d']
function avatarColor(name: string) {
  let h = 0; for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}
function cx(...c: (string|false|null|undefined)[]) { return c.filter(Boolean).join(' ') }
function formatFecha(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function ProveedoresTable({ proveedores, totalCount, page, pageSize, cuentaEstados, filters, perfil, responsables }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<Proveedor | null>(null)
  const [saving, setSaving] = useState(false)
  const originalResp = useRef<string | undefined>(undefined)
  const totalPages = Math.ceil(totalCount / pageSize)

  const buildUrl = (params: Record<string, string | undefined>) => {
    const base = new URLSearchParams()
    const merged = { ...filters, page: '0', ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) base.set(k, v) })
    return `/proveedores?${base.toString()}`
  }

  const handleSave = async (p: Proveedor) => {
    setSaving(true)
    const resp = responsables.find(r => r.id === p.responsable_id)
    await fetch(`/api/proveedores/${p.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        estado: p.estado,
        responsable_id: p.responsable_id || null,
        comentario: p.comentario,
        prevResponsableId: originalResp.current,
        responsable_mail: resp?.mail || null,
        responsable_nombre: resp?.nombre || null,
      }),
    })
    setSaving(false)
    setSelected(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este proveedor?')) return
    await fetch(`/api/proveedores/${id}`, { method: 'DELETE' })
    router.refresh()
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Alta de Proveedores</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{totalCount} solicitudes</p>
            <AutoRefresh />
          </div>
        </div>
        <a href="/alta-proveedor" target="_blank"
          style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#4f6ef7', color: 'white', borderRadius: 8, padding: '8px 16px', fontSize: 13, fontWeight: 600, textDecoration: 'none' }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
          Ver form público
        </a>
      </div>

      {/* Estado chips */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {['Todos', ...ESTADOS].map(e => {
          const cfg = ESTADO_CFG[e]
          const n = e === 'Todos' ? totalCount : (cuentaEstados[e] || 0)
          const active = e === 'Todos' ? !filters.estado : filters.estado === e
          return (
            <button key={e} onClick={() => router.push(buildUrl({ estado: e === 'Todos' ? undefined : e }))}
              className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                active ? (cfg ? `${cfg.bg} ${cfg.color} border-current` : 'bg-gray-900 text-white border-gray-900') : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
              )}>
              {cfg && <span className={cx('w-1.5 h-1.5 rounded-full', cfg.dot)} />}
              {e} <span className="font-mono ml-0.5 opacity-60">{n}</span>
            </button>
          )
        })}
      </div>

      {/* Búsqueda */}
      <div style={{ marginBottom: 16, position: 'relative', display: 'inline-block' }}>
        <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input
          defaultValue={filters.q}
          onChange={e => { clearTimeout((window as any).__searchTimer); (window as any).__searchTimer = setTimeout(() => router.push(buildUrl({ q: e.target.value || undefined })), 400) }}
          placeholder="Buscar razón social…"
          style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 260 }}
        />
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {proveedores.length === 0 ? (
          <p style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Sin proveedores</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                {['Razón Social','País','Estado','Responsable','Fecha',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {proveedores.map((p, i) => {
                const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG['Pendiente']
                const resp = p.responsable
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{p.razon_social}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{p.mail_contacto}</p>
                      {p.servicios && p.servicios.length > 0 && (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 5 }}>
                          {p.servicios.map(s => (
                            <span key={s} style={{ background: '#eff6ff', color: '#1d4ed8', borderRadius: 5, padding: '1px 7px', fontSize: 11, fontWeight: 600 }}>{s}</span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#374151' }}>{p.pais || '—'}</span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />{p.estado}
                      </span>
                    </td>
                    <td style={{ padding: '11px 14px' }}>
                      {resp ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: avatarColor(resp.nombre), color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 700 }}>{resp.nombre.charAt(0)}</div>
                          <span style={{ color: '#374151' }}>{resp.nombre}</span>
                        </div>
                      ) : <span style={{ color: '#d1d5db', fontSize: 12 }}>Sin asignar</span>}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>{formatFecha(p.created_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => { originalResp.current = p.responsable_id; setSelected({ ...p }) }}
                          title="Ver / editar"
                          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(p.id)} title="Eliminar"
                          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#d1d5db', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
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

      {/* Paginación */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 4, marginTop: 14 }}>
          <button onClick={() => router.push(buildUrl({ page: String(page - 1) }))} disabled={page === 0}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page === 0 ? 0.3 : 1 }}>‹ Anterior</button>
          <button onClick={() => router.push(buildUrl({ page: String(page + 1) }))} disabled={page >= totalPages - 1}
            style={{ padding: '6px 12px', fontSize: 12, borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer', opacity: page >= totalPages - 1 ? 0.3 : 1 }}>Siguiente ›</button>
        </div>
      )}

      {/* Modal de detalle */}
      {selected && (
        <ProveedorModal
          proveedor={selected}
          responsables={responsables}
          saving={saving}
          onClose={() => setSelected(null)}
          onSave={handleSave}
          onChange={p => setSelected(p)}
        />
      )}
    </div>
  )
}

function ProveedorModal({ proveedor, responsables, saving, onClose, onSave, onChange }: {
  proveedor: Proveedor
  responsables: { id: string; nombre: string; mail: string }[]
  saving: boolean
  onClose: () => void
  onSave: (p: Proveedor) => void
  onChange: (p: Proveedor) => void
}) {
  const cfg = ESTADO_CFG[proveedor.estado] || ESTADO_CFG['Pendiente']
  const set = (k: keyof Proveedor) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
    onChange({ ...proveedor, [k]: e.target.value })

  const row = (label: string, value?: string) => value ? (
    <div key={label}>
      <p style={{ margin: '0 0 2px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>{label}</p>
      <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{value}</p>
    </div>
  ) : null

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{proveedor.razon_social}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>{proveedor.nombre_fantasia} · {proveedor.pais} · {proveedor.mail_contacto}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>×</button>
        </div>

        {/* Datos completos */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
          {proveedor.servicios && proveedor.servicios.length > 0 && (
            <div>
              <p style={{ margin: '0 0 8px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Tipo de servicios</p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {proveedor.servicios.map(s => (
                  <span key={s} style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #dbeafe', borderRadius: 8, padding: '4px 12px', fontSize: 12.5, fontWeight: 600 }}>{s}</span>
                ))}
              </div>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 20px', background: '#f9fafb', borderRadius: 10, padding: 16 }}>
            {row('Domicilio', proveedor.domicilio)}
            {row('Ciudad', proveedor.ciudad)}
            {row('Teléfono', proveedor.telefono)}
            {row('CUIT', proveedor.cuit)}
            {row('Condición impositiva', proveedor.condicion_impositiva)}
            {row('Forma de pago', proveedor.forma_pago)}
            {row('Moneda', proveedor.moneda_pago)}
            {row('Término de pago', proveedor.termino_pago)}
            {row('Mail pagos', proveedor.mail_pagos)}
            {row('Tel. emergencias', proveedor.telefono_emergencias)}
          </div>
          {proveedor.datos_bancarios && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: 12 }}>
              <p style={{ margin: '0 0 4px', fontSize: 10, fontWeight: 700, color: '#16a34a', textTransform: 'uppercase' }}>Datos bancarios</p>
              <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{proveedor.datos_bancarios}</p>
            </div>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
            {row('Contacto Admin', proveedor.contacto_admin)}
            {row('Contacto Comercial', proveedor.contacto_comercial)}
            {row('Reservas', proveedor.contacto_reservas)}
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid #f0f0f0' }} />

          {/* Gestión interna */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' }}>Estado</label>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {ESTADOS.map(e => {
                  const c = ESTADO_CFG[e]
                  const active = proveedor.estado === e
                  return (
                    <button key={e} onClick={() => onChange({ ...proveedor, estado: e })}
                      className={cx('flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                        active ? `${c.bg} ${c.color} border-current` : 'bg-white text-gray-400 border-gray-200 hover:border-gray-300'
                      )}>
                      <span className={cx('w-1.5 h-1.5 rounded-full', c.dot)} />{e}
                    </button>
                  )
                })}
              </div>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' }}>Responsable</label>
              <select value={proveedor.responsable_id || ''} onChange={set('responsable_id')}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'white' }}>
                <option value="">Sin asignar</option>
                {responsables.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
              </select>
              {proveedor.responsable_id && proveedor.responsable_id !== proveedor.responsable?.id && (
                <p style={{ margin: '4px 0 0', fontSize: 12, color: '#2563eb' }}>✉ Se enviará mail al responsable asignado</p>
              )}
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 600, color: '#6b7280', marginBottom: 5, textTransform: 'uppercase' }}>Comentario interno</label>
              <textarea value={proveedor.comentario || ''} onChange={set('comentario')} rows={2}
                style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, resize: 'vertical', outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Cancelar</button>
          <button onClick={() => onSave(proveedor)} disabled={saving}
            style={{ padding: '8px 24px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: 'none', background: saving ? '#9ca3af' : '#4f6ef7', color: 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : 'Guardar'}
          </button>
        </div>
      </div>
    </div>
  )
}
