'use client'

import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { Perfil } from '@/lib/types'

interface Props {
  perfil: Perfil
}

export default function NavBar({ perfil }: Props) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <span className="text-xs text-slate-400 block leading-none">Tickets</span>
            <span className="font-semibold text-slate-800 text-sm leading-tight">
              {perfil.rol === 'admin' ? '⚡ Panel Admin' : `Mis tickets · ${perfil.nombre}`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {perfil.rol === 'admin' && (
            <a href="/admin"
              className="text-xs px-3 py-1.5 rounded-lg bg-brand-50 text-brand-700 font-medium hover:bg-brand-100 transition-colors">
              Admin
            </a>
          )}
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-brand-100 flex items-center justify-center text-xs font-bold text-brand-700">
              {perfil.nombre.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm text-slate-600 hidden sm:block">{perfil.nombre}</span>
          </div>
          <button onClick={logout}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 transition-colors">
            Salir
          </button>
        </div>
      </div>
    </header>
  )
}
