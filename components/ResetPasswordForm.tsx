'use client'

import { useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '12px 14px', borderRadius: 8,
  background: '#111', border: '1px solid #222',
  color: 'white', fontSize: 14, outline: 'none',
  fontFamily: 'inherit', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 700, color: '#666',
  letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 8,
}

export default function ResetPasswordForm() {
  const params = useSearchParams()
  const tokenHash = params.get('token_hash')
  const [pass, setPass] = useState('')
  const [pass2, setPass2] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (pass.length < 6) { setError('La contraseña tiene que tener al menos 6 caracteres'); return }
    if (pass !== pass2) { setError('Las contraseñas no coinciden'); return }

    setLoading(true)
    const supabase = createClient()
    // El token se canjea recién acá (no al abrir el link) para que el prefetch del mail no lo gaste
    const { error: otpError } = await supabase.auth.verifyOtp({ token_hash: tokenHash!, type: 'recovery' })
    if (otpError) {
      setError('El link venció o ya fue usado. Pedí uno nuevo desde el login.')
      setLoading(false)
      return
    }
    const { error: updError } = await supabase.auth.updateUser({ password: pass })
    if (updError) {
      setError(updError.message.includes('different')
        ? 'La nueva contraseña tiene que ser distinta a la anterior'
        : 'No se pudo guardar la contraseña, probá de nuevo')
      setLoading(false)
      return
    }
    window.location.href = '/dashboard'
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a', fontFamily: "'Outfit', system-ui, sans-serif", padding: 24 }}>
      <div style={{ width: '100%', maxWidth: 360 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 26, fontWeight: 700, color: 'white' }}>Nueva contraseña</h1>
        <p style={{ margin: '0 0 36px', fontSize: 14, color: '#555' }}>Elegí la contraseña con la que vas a ingresar</p>

        {!tokenHash ? (
          <p style={{ margin: 0, fontSize: 13, color: '#e8573f', background: 'rgba(232,87,63,0.1)', padding: '8px 12px', borderRadius: 6, border: '1px solid rgba(232,87,63,0.2)' }}>
            Link inválido. Pedí uno nuevo desde <a href="/login" style={{ color: '#e8573f' }}>el login</a>.
          </p>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <label style={labelStyle}>Nueva contraseña</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required placeholder="••••••••" style={inputStyle} autoFocus />
            </div>
            <div>
              <label style={labelStyle}>Repetir contraseña</label>
              <input type="password" value={pass2} onChange={e => setPass2(e.target.value)} required placeholder="••••••••" style={inputStyle} />
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
              letterSpacing: '0.03em', fontFamily: 'inherit', marginTop: 4,
            }}>
              {loading ? 'Guardando…' : 'Guardar y entrar →'}
            </button>
          </form>
        )}

        <p style={{ margin: '24px 0 0', fontSize: 12, textAlign: 'center' }}>
          <a href="/login" style={{ color: '#888', textDecoration: 'none' }}>← Volver a ingresar</a>
        </p>
      </div>
    </div>
  )
}
