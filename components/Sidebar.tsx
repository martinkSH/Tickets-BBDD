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
    { label: 'Todos los tickets', href: '/dashboard',   icon: <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" /> },
    { label: 'Mis tickets',       href: '/mis-tickets', icon: <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /> },
    { label: 'Nuevo ticket BBDD', href: '/nuevo',       icon: <Icon d="M12 4v16m8-8H4" /> },
    { label: 'Carga Tarifarios',  href: '/tarifarios',  icon: <Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" /> },
    { label: 'Alta Proveedores',    href: '/proveedores',  icon: <Icon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
    { label: 'Alta Clientes',        href: '/clientes',     icon: <Icon d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75M9 11a4 4 0 100-8 4 4 0 000 8z" /> },
  ]
  const analisis = [
    { label: 'Estadísticas', href: '/estadisticas', icon: <Icon d="M3 3v18h18M7 16l4-4 4 4 4-8" /> },
  ]
  const config = [
    { label: 'Configuración', href: '/settings', icon: <Icon d="M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" /> },
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

      {/* Header Atlas Archive */}
      <div className="px-4 pt-5 pb-4 border-b" style={{ borderColor: 'var(--sidebar-border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 7, flexShrink: 0,
            border: '1px solid #c9a96e',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: 11, fontWeight: 800, color: '#c9a96e', letterSpacing: '0.05em' }}>A</span>
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 5 }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: '#c9a96e', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Atlas</span>
              <span style={{ fontSize: 12, fontWeight: 700, color: 'white', letterSpacing: '0.1em', textTransform: 'uppercase' }}>Archive</span>
            </div>
            <p style={{ margin: 0, fontSize: 10, color: '#3d4460', letterSpacing: '0.03em' }}>Gestión de Base de Datos</p>
          </div>
        </div>
        <p style={{ margin: 0, fontSize: 9, color: '#2a2e40', letterSpacing: '0.02em' }}>developed by Martin Kravetz</p>
      </div>

      <nav className="flex-1 px-3 py-4 overflow-y-auto flex flex-col">
        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Gestión</p>
        <div className="space-y-0.5 mb-5">{gestion.map(i => <NavLink key={i.href} {...i} />)}</div>

        <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Proyectos</p>
        <div className="space-y-0.5 mb-5">
          <NavLink href="/proyectos" label="Tablero" icon={<Icon d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7" />} />
          <NavLink href="/proyectos/calendario" label="Calendario" icon={<Icon d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />} />
        </div>

        {(['admin','responsable IT','responsable IT/BBDD'].includes(perfil.rol)) && (<>
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Soporte IT</p>
          <div className="space-y-0.5 mb-5">
            <NavLink href="/tickets-it" label="Tickets IT" icon={<Icon d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />} />
            <NavLink href="/nuevo-it" label="Nuevo ticket IT" icon={<Icon d="M12 4v16m8-8H4" />} />
          </div>
        </>)}

        {perfil.rol === 'admin' && (<>
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Análisis</p>
          <div className="space-y-0.5 mb-5">{analisis.map(i => <NavLink key={i.href} {...i} />)}</div>
        </>)}

        {perfil.rol !== 'admin' && (<>
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Análisis</p>
          <div className="space-y-0.5 mb-5">
            <NavLink href="/mis-estadisticas" label="Mis estadísticas" icon={<Icon d="M3 3v18h18M7 16l4-4 4 4 4-8" />} />
          </div>
        </>)}

        {perfil.rol === 'admin' && (<>
          <p className="text-xs font-semibold uppercase tracking-widest px-3 mb-2" style={{ color: '#3d4460' }}>Sistema</p>
          <div className="space-y-0.5">{config.map(i => <NavLink key={i.href} {...i} />)}</div>
        </>)}
      </nav>

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
