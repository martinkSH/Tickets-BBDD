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
  // Esperar un tick para que las cookies se propaguen
  await new Promise(r => setTimeout(r, 500))
  window.location.href = '/dashboard'
}ndow.location.href = '/dashboard'
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4"
      style={{ background: 'var(--sidebar-bg)', fontFamily: 'var(--font)' }}>

      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
            style={{ background: 'var(--accent)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <h1 className="text-white text-xl font-semibold">Tickets</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-mono)' }}>BBDD & Tarifas</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-7" style={{ background: '#161b27', border: '1px solid var(--sidebar-border)' }}>
          <h2 className="text-white font-semibold text-lg mb-6">Iniciar sesión</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sidebar-text)' }}>Mail</label>
              <input type="email" value={mail} onChange={e => setMail(e.target.value)} required
                placeholder="nombre@sayhueque.com"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{ background: '#0f1117', border: '1px solid var(--sidebar-border)' }}
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--sidebar-text)' }}>Contraseña</label>
              <input type="password" value={pass} onChange={e => setPass(e.target.value)} required
                placeholder="••••••••"
                className="w-full px-3 py-2.5 rounded-lg text-sm text-white placeholder-gray-600 focus:outline-none"
                style={{ background: '#0f1117', border: '1px solid var(--sidebar-border)' }}
              />
            </div>
            {error && <p className="text-red-400 text-sm">{error}</p>}
            <button type="submit" disabled={loading}
              className="w-full py-2.5 rounded-lg text-white text-sm font-semibold transition-all disabled:opacity-60 mt-2"
              style={{ background: 'var(--accent)' }}>
              {loading ? 'Ingresando…' : 'Ingresar'}
            </button>
          </form>
          <p className="text-center text-xs mt-5" style={{ color: 'var(--sidebar-text)' }}>
            ¿Problemas para ingresar? Contactá a Martin
          </p>
        </div>
      </div>
    </div>
  )
}
