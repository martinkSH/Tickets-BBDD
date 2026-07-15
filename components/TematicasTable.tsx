'use client'

// Vista interna de Temáticas Especiales — la contracara del form /tematicas-especiales.
//
// Para qué: el form guarda el pedido, pero la nota hay que cargarla A MANO en la
// ficha del proveedor en TourPlan (este proyecto no tiene acceso a TP). Así que acá
// se ve qué quedó pendiente, se copia el bloque ya armado, se pega en TP y recién
// ahí se marca como Cargada.

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { buildNotaTP, TEMATICAS } from '@/lib/tematicas'
import { DESTINOS_TP } from '@/lib/destinos-tp'
import type { Perfil } from '@/lib/types'
import AutoRefresh from './AutoRefresh'

export interface TematicaRow {
  id: string
  created_at: string
  mail_solicitante: string
  proveedor: string
  destino: string
  tematica: string
  nombre_servicio?: string
  web_proveedor?: string
  descriptivo?: string
  comentarios?: string
  tarifa_aproximada?: string
  estado: string
  cargada_at?: string
  cargada_por?: string
}

interface Props {
  tematicas: TematicaRow[]
  totalCount: number
  page: number
  pageSize: number
  cuentaEstados: Record<string, number>
  filters: { estado?: string; q?: string; tematica?: string }
  perfil: Perfil
}

const ESTADOS = ['Pendiente', 'Cargada']
const ESTADO_CFG: Record<string, { bg: string; color: string; dot: string }> = {
  Pendiente: { bg: 'bg-amber-100',   color: 'text-amber-800',   dot: 'bg-amber-400'   },
  Cargada:   { bg: 'bg-emerald-100', color: 'text-emerald-800', dot: 'bg-emerald-500' },
}

// El desplegable del form graba el código (ej. 'MDZ'); acá lo mostramos con nombre.
const DESTINO_NOMBRE = new Map(DESTINOS_TP.map(d => [d.code, d.nombre]))

function cx(...c: (string | false | null | undefined)[]) { return c.filter(Boolean).join(' ') }
function formatFecha(iso?: string) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric', timeZone: 'America/Argentina/Buenos_Aires' })
}

export default function TematicasTable({ tematicas, totalCount, page, pageSize, cuentaEstados, filters, perfil }: Props) {
  const router = useRouter()
  const [selected, setSelected] = useState<TematicaRow | null>(null)
  const [saving, setSaving] = useState(false)
  const totalPages = Math.ceil(totalCount / pageSize)

  const buildUrl = (params: Record<string, string | undefined>) => {
    const base = new URLSearchParams()
    const merged = { ...filters, page: '0', ...params }
    Object.entries(merged).forEach(([k, v]) => { if (v) base.set(k, v) })
    return `/tematicas?${base.toString()}`
  }

  // Toggle Pendiente <-> Cargada. Al marcar Cargada se sella quién y cuándo; al
  // volver a Pendiente se limpian, así el sello nunca miente.
  const toggleEstado = async (t: TematicaRow) => {
    const cargada = t.estado !== 'Cargada'
    setSaving(true)
    const sb = createClient()
    const { error } = await sb.from('tematicas_especiales').update({
      estado: cargada ? 'Cargada' : 'Pendiente',
      cargada_at: cargada ? new Date().toISOString() : null,
      cargada_por: cargada ? (perfil.nombre || perfil.mail) : null,
    }).eq('id', t.id)
    setSaving(false)
    if (error) { alert('Error al guardar: ' + error.message); return }
    setSelected(null)
    router.refresh()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta temática?')) return
    const sb = createClient()
    const { error } = await sb.from('tematicas_especiales').delete().eq('id', id)
    if (error) { alert('Error al eliminar: ' + error.message); return }
    router.refresh()
  }

  return (
    <div style={{ padding: 32 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Temáticas Especiales</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <p style={{ margin: 0, fontSize: 13, color: '#9ca3af' }}>{totalCount} solicitudes</p>
            <AutoRefresh />
          </div>
        </div>
        <a href="/tematicas-especiales" target="_blank"
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

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input
            defaultValue={filters.q}
            onChange={e => { clearTimeout((window as any).__tematicaSearchTimer); (window as any).__tematicaSearchTimer = setTimeout(() => router.push(buildUrl({ q: e.target.value || undefined })), 400) }}
            placeholder="Buscar proveedor…"
            style={{ paddingLeft: 32, paddingRight: 12, paddingTop: 8, paddingBottom: 8, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 260 }}
          />
        </div>
        <select value={filters.tematica || ''} onChange={e => router.push(buildUrl({ tematica: e.target.value || undefined }))}
          style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'white', color: filters.tematica ? '#111827' : '#9ca3af' }}>
          <option value="">Todas las temáticas</option>
          {TEMATICAS.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Tabla */}
      <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {tematicas.length === 0 ? (
          <p style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>Sin temáticas</p>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f0f0f0' }}>
                {['Proveedor','Servicio','Destino','Temática','Estado','Fecha',''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tematicas.map((t, i) => {
                const cfg = ESTADO_CFG[t.estado] || ESTADO_CFG['Pendiente']
                return (
                  <tr key={t.id} style={{ borderBottom: '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>{t.proveedor}</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{t.mail_solicitante}</p>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{t.nombre_servicio || <span style={{ color: '#d1d5db' }}>—</span>}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span title={DESTINO_NOMBRE.get(t.destino) || t.destino}
                        style={{ background: '#f3f4f6', borderRadius: 6, padding: '2px 8px', fontSize: 12, fontWeight: 700, color: '#374151' }}>{t.destino}</span>
                    </td>
                    <td style={{ padding: '11px 14px', color: '#374151' }}>{t.tematica}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <span className={cx('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium', cfg.bg, cfg.color)}>
                        <span className={cx('w-1.5 h-1.5 rounded-full shrink-0', cfg.dot)} />{t.estado}
                      </span>
                      {t.estado === 'Cargada' && t.cargada_por && (
                        <p style={{ margin: '3px 0 0', fontSize: 11, color: '#9ca3af' }}>por {t.cargada_por}</p>
                      )}
                    </td>
                    <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>{formatFecha(t.created_at)}</td>
                    <td style={{ padding: '11px 14px' }}>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button onClick={() => setSelected(t)} title="Ver nota / marcar cargada"
                          style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #e5e7eb', background: 'white', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                        </button>
                        <button onClick={() => handleDelete(t.id)} title="Eliminar"
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

      {selected && (
        <TematicaModal
          tematica={selected}
          saving={saving}
          onClose={() => setSelected(null)}
          onToggle={toggleEstado}
        />
      )}
    </div>
  )
}

function TematicaModal({ tematica, saving, onClose, onToggle }: {
  tematica: TematicaRow
  saving: boolean
  onClose: () => void
  onToggle: (t: TematicaRow) => void
}) {
  const [copiado, setCopiado] = useState(false)
  const nota = buildNotaTP(tematica)
  const cargada = tematica.estado === 'Cargada'

  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(nota)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      alert('No se pudo copiar automáticamente — seleccioná el texto y usá Ctrl+C.')
    }
  }

  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(2px)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }}>
      <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 16, width: '100%', maxWidth: 700, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', marginBottom: 40 }}>
        {/* Header */}
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700 }}>{tematica.proveedor}</h2>
            <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>
              {tematica.tematica} · {DESTINO_NOMBRE.get(tematica.destino) || tematica.destino} ({tematica.destino}) · {tematica.mail_solicitante}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', fontSize: 20 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Dónde va */}
          <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, padding: 12 }}>
            <p style={{ margin: 0, fontSize: 12, color: '#1e40af', lineHeight: 1.5 }}>
              Pegar como nota <strong>Descripción Temática</strong> (DP1..DP9) en la ficha de{' '}
              <strong>{tematica.proveedor}</strong> en TourPlan. De ahí lo toma el módulo Temáticas Especiales de Atlas OPS.
            </p>
          </div>

          {/* Bloque para copiar */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
              <p style={{ margin: 0, fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase' }}>Nota para TourPlan</p>
              <button onClick={copiar}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 hover:bg-slate-200 transition">
                {copiado ? '✓ Copiado' : '📋 Copiar'}
              </button>
            </div>
            <textarea readOnly value={nota} rows={15}
              onFocus={e => e.currentTarget.select()}
              style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'ui-monospace, monospace', background: '#f9fafb', color: '#374151', resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
          </div>

          {cargada && (
            <p style={{ margin: 0, fontSize: 12, color: '#059669' }}>
              ✓ Cargada en TourPlan el {formatFecha(tematica.cargada_at)}{tematica.cargada_por ? ` por ${tematica.cargada_por}` : ''}.
            </p>
          )}
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f0f0f0', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button onClick={onClose} style={{ padding: '8px 18px', fontSize: 13, borderRadius: 8, border: '1px solid #e5e7eb', background: 'white', cursor: 'pointer' }}>Cerrar</button>
          <button onClick={() => onToggle(tematica)} disabled={saving}
            style={{ padding: '8px 24px', fontSize: 13, fontWeight: 600, borderRadius: 8, border: cargada ? '1px solid #e5e7eb' : 'none', background: saving ? '#9ca3af' : (cargada ? 'white' : '#059669'), color: cargada ? '#6b7280' : 'white', cursor: saving ? 'not-allowed' : 'pointer' }}>
            {saving ? 'Guardando…' : (cargada ? 'Volver a pendiente' : '✓ Marcar como cargada')}
          </button>
        </div>
      </div>
    </div>
  )
}
