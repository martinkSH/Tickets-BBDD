import type { Perfil } from '@/lib/types'
import Sidebar from './Sidebar'

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
        {children}
      </main>
    </div>
  )
}
