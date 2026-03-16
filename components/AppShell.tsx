'use client'

import { useState } from 'react'
import type { Perfil } from '@/lib/types'
import Sidebar from './Sidebar'
import OnlineUsers from './OnlineUsers'
import Chat from './Chat'
import AIAssistant from './AIAssistant'

interface Props {
  perfil: Perfil
  children: React.ReactNode
}

export default function AppShell({ perfil, children }: Props) {
  const [chatWindows, setChatWindows] = useState<{ user: { id: string; nombre: string }; open: boolean }[]>([])
  const [unreadByUser, setUnreadByUser] = useState<Record<string, number>>({})

  const openChat = (user: { id: string; nombre: string }) => {
    setChatWindows(prev => {
      const exists = prev.find(w => w.user.id === user.id)
      if (exists) return prev.map(w => w.user.id === user.id ? { ...w, open: true } : w)
      return [...prev, { user, open: true }]
    })
    setUnreadByUser(u => ({ ...u, [user.id]: 0 }))
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar perfil={perfil} />
      <main
        style={{ marginLeft: 'var(--sidebar-w)', fontFamily: 'var(--font)' }}
        className="flex-1 min-h-screen"
      >
        {/* Barra superior */}
        <div style={{
          position: 'sticky', top: 0, zIndex: 20,
          display: 'flex', justifyContent: 'flex-end', alignItems: 'center',
          padding: '8px 24px',
          background: 'rgba(249,250,251,0.9)',
          backdropFilter: 'blur(8px)',
          borderBottom: '1px solid #f0f0f0',
          minHeight: 44,
        }}>
          <OnlineUsers
            perfil={perfil}
            onOpenChat={openChat}
            unreadByUser={unreadByUser}
          />
        </div>

        {children}
      </main>

      {/* Asistente IA flotante */}
      <AIAssistant />

      {/* Chat flotante */}
      <Chat
        perfil={perfil}
        windows={chatWindows}
        setWindows={setChatWindows}
        unreadByUser={unreadByUser}
        setUnreadByUser={setUnreadByUser}
      />
    </div>
  )
}
