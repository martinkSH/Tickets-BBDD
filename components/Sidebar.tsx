'use client'

import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'
import { cx } from '@/lib/types'

interface Props { perfil: Perfil }

function Icon({ d }: { d: string }) {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  )
}

export default function Sidebar({ perfil }: Props) {
  const pathname = usePathname()
  const router = useRouter()

  const logout = async () => {
    const sb = createClient()
    await sb.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const gestion = [
    { label: 'Todos los tickets', href: '/dashboard', icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { label: 'Mis tickets',       href: '/mis-tickets', icon: <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { label: 'Nuevo ticket',      href: '/nuevo',       icon: <Icon d="M12 4v16m8-8H4" /> },
  ]

  const analisis = [
    { label: 'Estadísticas', href: '/estadisticas', icon: <Icon d="M3 3v18h18M7 16l4-4 4 4 4-8" /> },
  ]

  const NavLink = ({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) => {
    const active = pathname === href || pathname.startsWith(href + '/')
    return (
      <a href={href}
        className={cx('flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all', active ? 'text-white font-medium' : 'hover:text-white')}
        style={{ color: active ? 'var(--sidebar-active)' : 'var(--sidebar-text)', background: active ? 'rgba(79,110,247,0.15)' : 'transparent' }}>
        <span style={{ color: active ? 'var(--accent)' : 'inherit' }}>{icon}</span>
        {label}
      </a>
    )
  }

  return (
    <aside style={{ width: 'var(--sidebar-w)', background: 'var(--sidebar-bg)', borderRight: '1px solid var(--sidebar-border)' }}
      className="fixed left-0 top-0 h-screen flex flex-col z-30 shrink-0">

      {/* Logo */}
      <div className="px-5 py-5 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-none">Tickets</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--sidebar-text)', fontFamily: 'var(--font-mono)' }}>BBDD & Tarifas</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 overflow-y-auto" style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Gestión</p>
        <div className="space-y-0.5 mb-5">
          {gestion.map(item => <NavLink key={item.href} {...item} />)}
        </div>

        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Análisis</p>
        <div className="space-y-0.5">
          {analisis.map(item => <NavLink key={item.href} {...item} />)}
        </div>
      </nav>

      {/* Usuario */}
      <div className="px-3 py-4 border-t" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)' }}>
          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{ background: 'var(--accent)', color: 'white' }}>
            {perfil.nombre.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-sm font-medium truncate leading-none">{perfil.nombre}</p>
            <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--sidebar-text)' }}>{perfil.rol}</p>
          </div>
          <button onClick={logout} title="Salir" className="shrink-0 transition-opacity hover:opacity-100 opacity-50" style={{ color: 'var(--sidebar-text)' }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  )
}
