'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import AppShell from '@/components/AppShell'
import type { Perfil } from '@/lib/types'
import { TIPOS_TICKET } from '@/lib/types'

const ROLES = ['admin', 'responsable']

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'white', border: '1px solid #f0f0f0', borderRadius: 12, padding: '24px', marginBottom: 24 }}>
      <h2 style={{ margin: '0 0 20px', fontSize: 15, fontWeight: 700, color: '#111827' }}>{title}</h2>
      {children}
    </div>
  )
}

function Tag({ label, onRemove }: { label: string; onRemove?: () => void }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f3f4f6', borderRadius: 20, padding: '4px 12px', fontSize: 13, color: '#374151' }}>
      {label}
      {onRemove && (
        <button onClick={onRemove} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0, lineHeight: 1, fontSize: 16 }}>×</button>
      )}
    </span>
  )
}

export default function SettingsPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [usuarios, setUsuarios] = useState<Perfil[]>([])
  const [tiposTicket, setTiposTicket] = useState<string[]>([...TIPOS_TICKET])
  const [loading, setLoading] = useState(true)
  const [msg, setMsg] = useState('')

  // Nuevo usuario
  const [nuNombre, setNuNombre] = useState('')
  const [nuMail, setNuMail] = useState('')
  const [nuPass, setNuPass] = useState('')
  const [nuRol, setNuRol] = useState('responsable')
  const [nuLoading, setNuLoading] = useState(false)
  const [nuError, setNuError] = useState('')

  // Nuevo tipo ticket
  const [nuTipo, setNuTipo] = useState('')

  const router = useRouter()

  useEffect(() => {
    const init = async () => {
      const sb = createClient()
      const { data: { session } } = await sb.auth.getSession()
      if (!session) { router.push('/login'); return }
      const { data: p } = await sb.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { router.push('/login'); return }
      setPerfil(p)

      const { data: u } = await sb.from('perfiles').select('*').order('nombre')
      setUsuarios(u || [])

      // Cargar tipos ticket dinámicos desde settings
      const res = await fetch('/api/settings')
      if (res.ok) {
        const settings = await res.json()
        const tiposSetting = settings.find((s: any) => s.key === 'tipos_ticket')
        if (tiposSetting?.value) setTiposTicket(tiposSetting.value)
      }
      setLoading(false)
    }
    init()
  }, [])

  const agregarUsuario = async () => {
    if (!nuNombre || !nuMail || !nuPass) { setNuError('Completá todos los campos'); return }
    setNuLoading(true)
    setNuError('')
    try {
      const sb = createClient()
      // Crear en Auth
      const { data: authData, error: authError } = await sb.auth.admin?.createUser({
        email: nuMail,
        password: nuPass,
        email_confirm: true,
      }) as any

      if (authError) {
        // Si no tiene permisos admin, intentar signup normal
        setNuError('No se pudo crear via admin. Creá el usuario desde Supabase Auth manualmente y luego agregá el perfil.')
        setNuLoading(false)
        return
      }

      // Insertar perfil
      await sb.from('perfiles').upsert({
        id: authData.user.id,
        nombre: nuNombre,
        mail: nuMail,
        rol: nuRol,
        activo: true,
      })

      setNuNombre(''); setNuMail(''); setNuPass(''); setNuRol('responsable')
      const { data: u } = await sb.from('perfiles').select('*').order('nombre')
      setUsuarios(u || [])
      setMsg('Usuario creado correctamente')
      setTimeout(() => setMsg(''), 3000)
    } catch {
      setNuError('Error al crear usuario')
    }
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
    setTiposTicket(nuevos)
    setNuTipo('')
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'tipos_ticket', value: nuevos }),
    })
  }

  const eliminarTipo = async (tipo: string) => {
    const nuevos = tiposTicket.filter(t => t !== tipo)
    setTiposTicket(nuevos)
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key: 'tipos_ticket', value: nuevos }),
    })
  }

  if (!perfil) return null

  return (
    <AppShell perfil={perfil}>
      <div style={{ padding: '32px', maxWidth: 760 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontSize: 24, fontWeight: 700, color: '#111827' }}>Configuración</h1>
          <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>Usuarios, tipos de ticket y opciones del sistema</p>
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
                      <span style={{ background: u.activo ? '#dcfce7' : '#fee2e2', color: u.activo ? '#16a34a' : '#dc2626', borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 600 }}>
                        {u.activo ? 'Activo' : 'Inactivo'}
                      </span>
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
              <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>
                💡 Si falla la creación automática, creá el usuario en <a href="https://supabase.com/dashboard/project/mmdbqnewkbrqhfqlhyel/auth/users" target="_blank" style={{ color: '#4f6ef7' }}>Supabase Auth</a> y se agregará el perfil automáticamente.
              </p>
            </div>
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
            <p style={{ margin: '10px 0 0', fontSize: 12, color: '#9ca3af' }}>Los cambios se aplican inmediatamente en el modal de resolución de tickets.</p>
          </Section>

        </>}
      </div>
    </AppShell>
  )
}
