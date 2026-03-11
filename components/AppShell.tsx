import type { Perfil } from '@/lib/types'
import Sidebar from './Sidebar'
import OnlineUsers from './OnlineUsers'

interface Props {
  perfil: Perfil
  children: React.ReactNode
}

export default function AppShell({ perfil, children }: Props) {
  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} />
      <main
        style={{ marginLeft: 'var(--sidebar-w)', fontFamily: 'var(--font)' }}
        className="flex-1 min-h-screen"
      >
        {/* Barra superior con usuarios online */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          padding: '8px 24px',
          background: 'rgba(249,250,251,0.85)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <OnlineUsers perfil={perfil} />
        </div>
        {children}
      </main>
    </div>
  )
}
