'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function LoginForm() {
  const [mail, setMail] = useState('')
  const [pass, setPass] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const supabase = createClient()
    const { error: authError } = await supabase.auth.signInWithPassword({ email: mail, password: pass })
    if (authError) {
      setError('Mail o contraseña incorrectos')
      setLoading(false)
      return
    }
    await new Promise(r => setTimeout(r, 500))
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', background: '#0a0a0a', fontFamily: "'Outfit', system-ui, sans-serif" }}>

      {/* Panel izquierdo — branding */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '48px 56px', borderRight: '1px solid #1a1a1a' }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 10,
            border: '1px solid #c9a96e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 12, fontWeight: 800, color: '#c9a96e', letterSpacing: '0.05em' }}>A</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
              <span style={{ fontSize: 16, fontWeight: 700, color: '#c9a96e', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Atlas</span>
              <span style={{ fontSize: 16, fontWeight: 700, color: 'white', letterSpacing: '0.12em', textTransform: 'uppercase' }}>Archive</span>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: '#555', letterSpacing: '0.05em' }}>Gestión de Base de Datos</p>
          </div>
        </div>

        {/* Tagline central */}
        <div>
          <p style={{ margin: '0 0 12px', fontSize: 11, fontWeight: 600, color: '#444', letterSpacing: '0.15em', textTransform: 'uppercase' }}>Say Hueque · Operaciones</p>
          <h2 style={{ margin: 0, fontSize: 42, fontWeight: 700, color: 'white', lineHeight: 1.15 }}>
            Base de Datos<br />
            <span style={{ color: '#c9a96e' }}>en tiempo real.</span>
          </h2>
          <p style={{ margin: '16px 0 0', fontSize: 14, color: '#555', lineHeight: 1.6, maxWidth: 360 }}>
            Tickets, tarifarios y proveedores. Todo el flujo operativo de Say Hueque en un solo lugar.
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 11, color: '#333' }}>powered by MK · v0.1</p>
      </div>

      {/* Panel derecho — formulario */}
      <div style={{ width: 480, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '48px 56px' }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: 'white' }}>Bienvenido</h1>
          <p style={{ margin: '0 0 36px', fontSize: 14, color: '#555' }}>Ingresá para acceder al sistema</p>

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Email</label>
              <input
                type="email" value={mail} onChange={e => setMail(e.target.value)} required
                placeholder="nombre@sayhueque.com"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: '#111', border: `1px solid ${mail ? '#c9a96e' : '#222'}`,
                  color: 'white', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                  transition: 'border-color 0.15s',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#666', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8 }}>Contraseña</label>
              <input
                type="password" value={pass} onChange={e => setPass(e.target.value)} required
                placeholder="••••••••"
                style={{
                  width: '100%', padding: '12px 14px', borderRadius: 8,
                  background: '#111', border: '1px solid #222',
                  color: 'white', fontSize: 14, outline: 'none',
                  fontFamily: 'inherit', boxSizing: 'border-box',
                }}
              />
            </div>

            {error && (
              <p style={{ margin: 0, fontSize: 13, color: '#e8573f', background: 'rgba(232,87,63,0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(232,87,63,0.2)' }}>
                {error}
              </p>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '13px', borderRadius: 8, border: 'none',
              background: loading ? '#333' : '#e8573f',
              color: 'white', fontSize: 14, fontWeight: 600,
              cursor: loading ? 'not-allowed' : 'pointer',
              letterSpacing: '0.03em', transition: 'background 0.15s',
              fontFamily: 'inherit', marginTop: 4,
            }}>
              {loading ? 'Ingresando…' : 'Ingresar →'}
            </button>
          </form>

          <p style={{ margin: '24px 0 0', fontSize: 12, color: '#333', textAlign: 'center' }}>
            Acceso restringido · Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  )
}
