'use client'

import { useEffect, useState, useMemo } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'
import { TIPOS_TICKET } from '@/lib/types'

const ROLES = ['admin', 'responsable']

interface EstadoExtra { key: string; label: string; pausa: boolean }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h2>
      {children}
    </div>
  )
}

function Tag({ label, sub, onRemove }: { label: string; sub?: string; onRemove?: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#374151' }}>
      {label}{sub && <span style={{ fontSize: 11, color: '#9ca3af' }}>{sub}</span>}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1, fontSize: 16 }}>×</button>
      )}
    </span>
  )
}

const COLORES_ESTADO = [
  { id: 'cyan',   label: 'Cyan',    dot: '#22d3ee' },
  { id: 'pink',   label: 'Rosa',    dot: '#f472b6' },
  { id: 'teal',   label: 'Teal',    dot: '#2dd4bf' },
  { id: 'lime',   label: 'Lima',    dot: '#a3e635' },
  { id: 'rose',   label: 'Rojo',    dot: '#fb7185' },
]

const AREAS = ['GRUPOS', 'FITS', 'ALIWEN', 'B2C', 'OTRO']
const AREA_COLORS: Record<string, { bg: string; color: string }> = {
  GRUPOS: { bg: '#fef3c7', color: '#92400e' },
  FITS:   { bg: '#dbeafe', color: '#1e40af' },
  ALIWEN: { bg: '#d1fae5', color: '#065f46' },
  B2C:    { bg: '#ede9fe', color: '#5b21b6' },
  OTRO:   { bg: '#f3f4f6', color: '#374151' },
}

interface Solicitante {
  mail: string
  area: string | null
  total?: number
}

function SolicitantesAreas() {
  const [solicitantes, setSolicitantes] = useState<Solicitante[]>([])
  const [mapa, setMapa] = useState<Record<string, string>>({}) // mail → area
  const [busqueda, setBusqueda] = useState('')
  const [filtroArea, setFiltroArea] = useState<string>('Todos')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    cargar()
  }, [])

  const cargar = async () => {
    setLoading(true)
    // Cargar mapa existente desde settings
    const res = await fetch('/api/settings')
    const settings = await res.json()
    const mapaActual: Record<string, string> = {}
    const existente = settings.find((s: any) => s.key === 'solicitantes_areas')
    if (existente?.value) {
      for (const s of existente.value) {
        mapaActual[s.mail.toLowerCase()] = s.area.toUpperCase()
      }
    }
    setMapa(mapaActual)

    // Cargar todos los mails únicos de tickets
    const res2 = await fetch('/api/solicitantes-list')
    if (res2.ok) {
      const data = await res2.json()
      const lista: Solicitante[] = data.map((d: any) => ({
        mail: d.mail.toLowerCase(),
        area: mapaActual[d.mail.toLowerCase()] || null,
        total: d.total,
      }))
      // Ordenar: sin área primero, luego por total desc
      lista.sort((a, b) => {
        if (!a.area && b.area) return -1
        if (a.area && !b.area) return 1
        return (b.total || 0) - (a.total || 0)
      })
      setSolicitantes(lista)
    }
    setLoading(false)
  }

  const cambiarArea = async (mail: string, area: string) => {
    setSaving(mail)
    const nuevoMapa = { ...mapa, [mail]: area }
    setMapa(nuevoMapa)
    setSolicitantes(prev => prev.map(s => s.mail === mail ? { ...s, area } : s))

    const value = Object.entries(nuevoMapa).map(([m, a]) => ({ mail: m, area: a }))
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'solicitantes_areas', value }),
    })
    setSaving(null)
    setMsg('Guardado')
    setTimeout(() => setMsg(''), 2000)
  }

  const filtrados = useMemo(() => {
    return solicitantes.filter(s => {
      const matchBusqueda = !busqueda || s.mail.includes(busqueda.toLowerCase())
      const matchArea = filtroArea === 'Todos'
        ? true
        : filtroArea === 'Sin área'
        ? !s.area
        : s.area === filtroArea
      return matchBusqueda && matchArea
    })
  }, [solicitantes, busqueda, filtroArea])

  const sinArea = solicitantes.filter(s => !s.area).length
  const conArea = solicitantes.filter(s => s.area).length

  return (
    <div>
      {/* Resumen */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 18 }}>
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
          <span style={{ fontWeight: 700, color: '#16a34a' }}>{conArea}</span>
          <span style={{ color: '#6b7280', marginLeft: 4 }}>con área asignada</span>
        </div>
        {sinArea > 0 && (
          <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: 8, padding: '8px 14px', fontSize: 13 }}>
            <span style={{ fontWeight: 700, color: '#d97706' }}>{sinArea}</span>
            <span style={{ color: '#6b7280', marginLeft: 4 }}>sin área — no aparecen en estadísticas por área</span>
          </div>
        )}
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: 16 }}>
        <div style={{ position: 'relative' }}>
          <svg style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input value={busqueda} onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar mail…"
            style={{ paddingLeft: 30, paddingRight: 12, paddingTop: 7, paddingBottom: 7, border: '1px solid #e5e7eb', borderRadius: 8, fontSize: 13, outline: 'none', width: 220 }} />
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {['Todos', 'Sin área', ...AREAS].map(a => (
            <button key={a} onClick={() => setFiltroArea(a)}
              style={{
                padding: '6px 12px', fontSize: 12, fontWeight: 500, borderRadius: 20,
                border: '1px solid',
                borderColor: filtroArea === a ? (a === 'Sin área' ? '#fcd34d' : '#4f6ef7') : '#e5e7eb',
                background: filtroArea === a ? (a === 'Sin área' ? '#fef3c7' : (AREA_COLORS[a]?.bg || '#eff6ff')) : 'white',
                color: filtroArea === a ? (a === 'Sin área' ? '#92400e' : (AREA_COLORS[a]?.color || '#1e40af')) : '#6b7280',
                cursor: 'pointer',
              }}>
              {a}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {msg && (
        <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '8px 14px', fontSize: 13, color: '#16a34a', marginBottom: 12, display: 'inline-block' }}>
          ✓ {msg}
        </div>
      )}

      {/* Tabla */}
      {loading ? (
        <p style={{ color: '#9ca3af', fontSize: 13 }}>Cargando solicitantes…</p>
      ) : (
        <div style={{ border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb' }}>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Mail</th>
                <th style={{ padding: '9px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Tickets</th>
                <th style={{ padding: '9px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>Área</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.length === 0 ? (
                <tr><td colSpan={3} style={{ padding: '30px', textAlign: 'center', color: '#9ca3af' }}>Sin resultados</td></tr>
              ) : filtrados.map((s, i) => {
                const areaCfg = s.area ? AREA_COLORS[s.area] : null
                return (
                  <tr key={s.mail} style={{ borderTop: '1px solid #f9fafb', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                    <td style={{ padding: '9px 14px', color: '#374151' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {!s.area && (
                          <span title="Sin área asignada" style={{ width: 7, height: 7, borderRadius: '50%', background: '#f59e0b', flexShrink: 0, display: 'inline-block' }} />
                        )}
                        {s.mail}
                      </div>
                    </td>
                    <td style={{ padding: '9px 14px', textAlign: 'center', fontWeight: 600, color: '#6b7280' }}>{s.total || '—'}</td>
                    <td style={{ padding: '9px 14px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        {areaCfg && (
                          <span style={{ background: areaCfg.bg, color: areaCfg.color, borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700 }}>
                            {s.area}
                          </span>
                        )}
                        <select
                          value={s.area || ''}
                          onChange={e => cambiarArea(s.mail, e.target.value)}
                          disabled={saving === s.mail}
                          style={{
                            border: '1px solid #e5e7eb', borderRadius: 6, padding: '4px 8px',
                            fontSize: 12, outline: 'none', background: 'white', cursor: 'pointer',
                            color: s.area ? '#374151' : '#9ca3af',
                            opacity: saving === s.mail ? 0.5 : 1,
                          }}>
                          <option value="" disabled>{s.area ? 'Cambiar…' : 'Asignar área…'}</option>
                          {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                        {saving === s.mail && (
                          <span style={{ fontSize: 11, color: '#9ca3af' }}>Guardando…</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          <div style={{ padding: '8px 14px', background: '#f9fafb', borderTop: '1px solid #f0f0f0', fontSize: 12, color: '#9ca3af' }}>
            Mostrando {filtrados.length} de {solicitantes.length} solicitantes
          </div>
        </div>
      )}
    </div>
  )
}

export default function SettingsPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [usuarios, setUsuarios] = useState<Perfil[]>([])
  const [tiposTicket, setTiposTicket] = useState<string[]>([...TIPOS_TICKET])
  const [estadosExtra, setEstadosExtra] = useState<EstadoExtra[]>([])
  const [alertaDestinatarios, setAlertaDestinatarios] = useState<string[]>(['tarifas@sayhueque.com'])
  const [nuMailAlerta, setNuMailAlerta] = useState('')
  const [tarifDestinatarios, setTarifDestinatarios] = useState<{mail:string;area:string}[]>([])
  const [nuTarifMail, setNuTarifMail] = useState('')
  const [nuTarifArea, setNuTarifArea] = useState('Todas')
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  const [nuNombre, setNuNombre] = useState('')
  const [nuMail, setNuMail] = useState('')
  const [nuPass, setNuPass] = useState('')
  const [nuRol, setNuRol] = useState('responsable')
  const [nuLoading, setNuLoading] = useState(false)
  const [nuError, setNuError] = useState('')

  const [nuTipo, setNuTipo] = useState('')

  const [nuEstado, setNuEstado] = useState('')
  const [autoAssign, setAutoAssign] = useState(false)
  const [nuEstadoPausa, setNuEstadoPausa] = useState(false)

  const router = useRouter()

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 3000) }

  const saveSetting = async (key: string, value: any) => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, value }),
    })
  }

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      if (p.rol !== 'admin') { router.push('/dashboard'); return }
      setPerfil(p)
      const { data: u } = await sb.from('perfiles').select('*').order('nombre')
      setUsuarios(u || [])
      const res = await fetch('/api/settings')
      if (res.ok) {
        const settings = await res.json()
        const tiposSetting = settings.find((s: any) => s.key === 'tipos_ticket')
        if (tiposSetting?.value) setTiposTicket(tiposSetting.value)
        const estadosSetting = settings.find((s: any) => s.key === 'estados_extra')
        if (estadosSetting?.value) setEstadosExtra(estadosSetting.value)
        const autoAssignSetting = settings.find((s: any) => s.key === 'auto_assign_enabled')
        setAutoAssign(!!autoAssignSetting?.value)
        const alertaSetting = settings.find((s: any) => s.key === 'alerta_destinatarios')
        if (alertaSetting?.value?.length) setAlertaDestinatarios(alertaSetting.value)
        const tarifSetting = settings.find((s: any) => s.key === 'tarifarios_destinatarios')
        if (tarifSetting?.value?.length) setTarifDestinatarios(tarifSetting.value)
      }
      setLoading(false)
    }
    init()
  }, [])

  const agregarUsuario = async () => {
    if (!nuNombre || !nuMail || !nuPass) { setNuError('Completá todos los campos'); return }
    setNuLoading(true); setNuError('')
    try {
      const sb = createClient()
      const res = await fetch('/api/auth/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nombre: nuNombre, mail: nuMail, password: nuPass, rol: nuRol }),
      })
      const data = await res.json()
      if (!res.ok) { setNuError(data.error || 'Error al crear usuario'); setNuLoading(false); return }
      setNuNombre(''); setNuMail(''); setNuPass(''); setNuRol('responsable')
      const { data: u } = await createClient().from('perfiles').select('*').order('nombre')
      setUsuarios(u || [])
      showMsg('Usuario creado correctamente')
    } catch { setNuError('Error al crear usuario') }
    setNuLoading(false)
  }

  const toggleActivo = async (id: string, activo: boolean) => {
    const sb = createClient()
    await sb.from('perfiles').update({ activo: !activo }).eq('id', id)
    setUsuarios(u => u.map(x => x.id === id ? { ...x, activo: !activo } : x))
  }

  const agregarTipo = async () => {
    if (!nuTipo.trim()) return
    const nuevos = [...tiposTicket, nuTipo.trim()]
    setTiposTicket(nuevos); setNuTipo('')
    await saveSetting('tipos_ticket', nuevos)
  }

  const eliminarTipo = async (tipo: string) => {
    const nuevos = tiposTicket.filter(t => t !== tipo)
    setTiposTicket(nuevos)
    await saveSetting('tipos_ticket', nuevos)
  }

  const toggleAutoAssign = async (val: boolean) => {
    setAutoAssign(val)
    await saveSetting('auto_assign_enabled', val)
    showMsg(val ? 'Auto-asignador activado' : 'Auto-asignador desactivado')
  }

  const agregarEstado = async () => {
    if (!nuEstado.trim()) return
    const key = nuEstado.trim()
    const nuevo: EstadoExtra = { key, label: key, pausa: nuEstadoPausa }
    const nuevos = [...estadosExtra, nuevo]
    setEstadosExtra(nuevos); setNuEstado(''); setNuEstadoPausa(false)
    await saveSetting('estados_extra', nuevos)
    showMsg('Estado agregado. Se verá en el modal de tickets.')
  }

  const eliminarEstado = async (key: string) => {
    const nuevos = estadosExtra.filter(e => e.key !== key)
    setEstadosExtra(nuevos)
    await saveSetting('estados_extra', nuevos)
  }

  const agregarTarifDestinatario = async () => {
    if (!nuTarifMail.trim() || tarifDestinatarios.find(d => d.mail === nuTarifMail.trim())) return
    const nuevos = [...tarifDestinatarios, { mail: nuTarifMail.trim(), area: nuTarifArea }]
    setTarifDestinatarios(nuevos); setNuTarifMail('')
    await saveSetting('tarifarios_destinatarios', nuevos)
  }

  const eliminarTarifDestinatario = async (mail: string) => {
    const nuevos = tarifDestinatarios.filter(d => d.mail !== mail)
    setTarifDestinatarios(nuevos)
    await saveSetting('tarifarios_destinatarios', nuevos)
  }

  const agregarDestinatario = async () => {
    if (!nuMailAlerta.trim() || alertaDestinatarios.includes(nuMailAlerta.trim())) return
    const nuevos = [...alertaDestinatarios, nuMailAlerta.trim()]
    setAlertaDestinatarios(nuevos); setNuMailAlerta('')
    await saveSetting('alerta_destinatarios', nuevos)
  }

  const eliminarDestinatario = async (mail: string) => {
    const nuevos = alertaDestinatarios.filter(m => m !== mail)
    setAlertaDestinatarios(nuevos)
    await saveSetting('alerta_destinatarios', nuevos)
  }

  if (!perfil) return null

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: '32px', maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Configuración</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Usuarios, estados y tipos de ticket</p>
        </div>

        {msg && <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#166534', marginBottom: 20 }}>{msg}</div>}

        {loading ? <p style={{ color: '#9ca3af' }}>Cargando…</p> : <>

          {/* Usuarios */}
          <Section title="👥 Usuarios">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 20 }}>
              <thead>
                <tr style={{ background: '#f9fafb' }}>
                  {['Nombre','Mail','Rol','Estado',''].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} style={{ borderTop: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '10px 12px', fontWeight: 600 }}>{u.nombre}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280' }}>{u.mail}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: u.rol === 'admin' ? '#ede9fe' : '#f0fdf4', color: u.rol === 'admin' ? '#7c3aed' : '#16a34a', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{u.rol}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ background: u.activo ? '#dcfce7' : '#fee2e2', color: u.activo ? '#16a34a' : '#dc2626', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{u.activo ? 'Activo' : 'Inactivo'}</span>
                    </td>
                    <td style={{ padding: '10px 12px' }}>
                      <button onClick={() => toggleActivo(u.id, u.activo)}
                        style={{ fontSize: 12, color: u.activo ? '#dc2626' : '#16a34a', background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '3px 10px', cursor: 'pointer' }}>
                        {u.activo ? 'Desactivar' : 'Activar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ borderTop: '1px solid #f0f0f0', paddingTop: 20 }}>
              <p style={{ margin: '0 0 14px', fontSize: 13, fontWeight: 600, color: '#374151' }}>Agregar usuario</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <input value={nuNombre} onChange={e => setNuNombre(e.target.value)} placeholder="Nombre"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                <input value={nuMail} onChange={e => setNuMail(e.target.value)} placeholder="Mail" type="email"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                <input value={nuPass} onChange={e => setNuPass(e.target.value)} placeholder="Contraseña" type="password"
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
                <select value={nuRol} onChange={e => setNuRol(e.target.value)}
                  style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'white' }}>
                  {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              {nuError && <p style={{ color: '#dc2626', fontSize: 12, marginBottom: 10 }}>{nuError}</p>}
              <button onClick={agregarUsuario} disabled={nuLoading}
                style={{ background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: nuLoading ? 0.6 : 1 }}>
                {nuLoading ? 'Creando…' : 'Crear usuario'}
              </button>
            </div>
          </Section>

          {/* Auto-asignador */}
          <Section title="🤖 Auto-asignador de tickets">
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 24 }}>
              <div style={{ flex: 1 }}>
                <p style={{ margin: '0 0 8px', fontSize: 13, color: '#374151' }}>
                  Cuando llega un ticket nuevo, el sistema elige automáticamente al mejor responsable considerando:
                </p>
                <ul style={{ margin: '0 0 12px', paddingLeft: 20, fontSize: 13, color: '#6b7280', lineHeight: 1.8 }}>
                  <li><strong>Historial con el solicitante</strong> — quién trabajó más con esa persona</li>
                  <li><strong>Historial con el proveedor</strong> — quién ya resolvió tickets de ese proveedor</li>
                  <li><strong>Carga actual</strong> — penaliza a quienes tienen más tickets abiertos</li>
                </ul>
                <p style={{ margin: 0, fontSize: 12, color: '#9ca3af' }}>
                  Solo se asigna a responsables con estado <strong>Activo</strong>. Si todos tienen la misma puntuación, elige al que tiene menos carga.
                </p>
              </div>
              <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                <button
                  onClick={() => toggleAutoAssign(!autoAssign)}
                  style={{
                    width: 52, height: 28, borderRadius: 14, border: 'none', cursor: 'pointer',
                    background: autoAssign ? '#4f6ef7' : '#d1d5db',
                    position: 'relative', transition: 'background 0.2s',
                  }}>
                  <span style={{
                    position: 'absolute', top: 3, left: autoAssign ? 27 : 3,
                    width: 22, height: 22, borderRadius: '50%', background: 'white',
                    transition: 'left 0.2s', boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    display: 'block',
                  }}/>
                </button>
                <span style={{ fontSize: 12, fontWeight: 700, color: autoAssign ? '#4f6ef7' : '#9ca3af' }}>
                  {autoAssign ? 'ACTIVO' : 'INACTIVO'}
                </span>
              </div>
            </div>
          </Section>

          {/* Estados extra */}
          <Section title="🚦 Estados de ticket">
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Los estados base (Recibido, Asignado, Pendiente Operador, Pendiente Ventas, Resuelto) no se pueden modificar. Podés agregar estados intermedios que aparecerán en el modal entre Pendiente Ventas y Resuelto.
            </p>

            {/* Estados fijos */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {['Recibido','Asignado','Pend. Operador ⏸','Pend. Ventas ⏸'].map(e => (
                <span key={e} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#9ca3af' }}>
                  🔒 {e}
                </span>
              ))}
              {estadosExtra.map(e => (
                <Tag key={e.key} label={e.label} sub={e.pausa ? '⏸' : undefined} onRemove={() => eliminarEstado(e.key)} />
              ))}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#dcfce7', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#9ca3af' }}>
                🔒 Resuelto
              </span>
            </div>

            <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
              <input value={nuEstado} onChange={e => setNuEstado(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregarEstado() }}
                placeholder="Nombre del nuevo estado…"
                style={{ flex: 1, minWidth: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#374151', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <input type="checkbox" checked={nuEstadoPausa} onChange={e => setNuEstadoPausa(e.target.checked)} style={{ width: 14, height: 14 }} />
                Pausa el tiempo ⏸
              </label>
              <button onClick={agregarEstado}
                style={{ background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                Agregar
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>Los cambios se aplican inmediatamente en el modal de tickets.</p>
          </Section>

          {/* Alertas de nuevo ticket */}
          <Section title="📬 Alertas de nuevo ticket">
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Estos mails reciben una notificación cada vez que se crea un ticket nuevo.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {alertaDestinatarios.map(m => (
                <Tag key={m} label={m} onRemove={alertaDestinatarios.length > 1 ? () => eliminarDestinatario(m) : undefined} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={nuMailAlerta} onChange={e => setNuMailAlerta(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregarDestinatario() }}
                placeholder="nuevo@sayhueque.com"
                type="email"
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <button onClick={agregarDestinatario}
                style={{ background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Agregar
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>Mínimo 1 destinatario requerido.</p>
          </Section>

          {/* Destinatarios Tarifarios */}
          <Section title="📋 Destinatarios de avisos de tarifarios">
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Reciben un mail cuando se carga un nuevo tarifario. Los del área <strong>Aliwen</strong> solo reciben avisos de país <strong>ARG</strong>.
            </p>
            {tarifDestinatarios.length > 0 && (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13, marginBottom: 16 }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    {['Mail','Área',''].map(h => <th key={h} style={{ padding: '7px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {tarifDestinatarios.map(d => (
                    <tr key={d.mail} style={{ borderTop: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '8px 12px', color: '#374151' }}>{d.mail}</td>
                      <td style={{ padding: '8px 12px' }}>
                        <span style={{ background: d.area === 'Aliwen' ? '#fef3c7' : '#ede9fe', color: d.area === 'Aliwen' ? '#92400e' : '#6d28d9', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>{d.area}</span>
                      </td>
                      <td style={{ padding: '8px 12px' }}>
                        <button onClick={() => eliminarTarifDestinatario(d.mail)} style={{ fontSize: 12, color: '#dc2626', background: 'none', border: '1px solid currentColor', borderRadius: 6, padding: '2px 8px', cursor: 'pointer' }}>Quitar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input value={nuTarifMail} onChange={e => setNuTarifMail(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregarTarifDestinatario() }}
                placeholder="mail@sayhueque.com" type="email"
                style={{ flex: 1, minWidth: 200, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <select value={nuTarifArea} onChange={e => setNuTarifArea(e.target.value)}
                style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none', background: 'white' }}>
                {['Todas','FIT','Grupos','Aliwen'].map(a => <option key={a} value={a}>{a}</option>)}
              </select>
              <button onClick={agregarTarifDestinatario}
                style={{ background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Agregar
              </button>
            </div>
          </Section>

          {/* Solicitantes y áreas */}
          <Section title="🗂️ Solicitantes y áreas">
            <p style={{ margin: '0 0 16px', fontSize: 13, color: '#6b7280' }}>
              Asigná cada solicitante a un área para que aparezca en las estadísticas por área. Los marcados con <span style={{ color: '#f59e0b' }}>●</span> no tienen área asignada.
            </p>
            <SolicitantesAreas />
          </Section>

          {/* Tipos de ticket */}
          <Section title="🏷️ Tipos de ticket (resolución)">
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
              {tiposTicket.map(t => (
                <Tag key={t} label={t} onRemove={() => eliminarTipo(t)} />
              ))}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <input value={nuTipo} onChange={e => setNuTipo(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') agregarTipo() }}
                placeholder="Nuevo tipo de ticket…"
                style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
              <button onClick={agregarTipo}
                style={{ background: '#4f6ef7', color: 'white', border: 'none', borderRadius: 8, padding: '8px 20px', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                Agregar
              </button>
            </div>
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>Los cambios se aplican inmediatamente en el modal de resolución.</p>
          </Section>

        </>}
      </div>
    </AppShell>
  )
}
