'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'

export interface PresenceUser {
  id: string
  nombre: string
  online_at: string
}

const AVATAR_COLORS = [
  '#4f6ef7','#7c3aed','#0891b2','#059669','#d97706','#dc2626','#db2777','#65a30d'
]
function avatarColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % AVATAR_COLORS.length
  return AVATAR_COLORS[h]
}

interface Props {
  perfil: Perfil
  onOpenChat: (user: { id: string; nombre: string }) => void
  unreadByUser: Record<string, number>
}

export default function OnlineUsers({ perfil, onOpenChat, unreadByUser }: Props) {
  const [onlineUsers, setOnlineUsers] = useState<PresenceUser[]>([])
  const [showTooltip, setShowTooltip] = useState(false)

  useEffect(() => {
    const sb = createClient()
    const channel = sb.channel('online-users', {
      config: { presence: { key: perfil.id } }
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState<PresenceUser>()
        const users = Object.values(state)
          .flat()
          .map(u => u as unknown as PresenceUser)
          .filter((u, i, arr) => arr.findIndex(x => x.id === u.id) === i)
          .sort((a, b) => a.nombre.localeCompare(b.nombre))
        setOnlineUsers(users)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            id: perfil.id,
            nombre: perfil.nombre,
            online_at: new Date().toISOString(),
          })
        }
      })

    return () => { sb.removeChannel(channel) }
  }, [perfil.id, perfil.nombre])

  const MAX_VISIBLE = 5
  const visible = onlineUsers.slice(0, MAX_VISIBLE)
  const extra = onlineUsers.length - MAX_VISIBLE

  const totalUnread = Object.values(unreadByUser).reduce((s, n) => s + n, 0)

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>

      {/* Punto verde pulsante */}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: 2 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'block',
        }} />
      </span>

      {/* Avatares */}
      <div style={{ display: 'flex', flexDirection: 'row-reverse' }}>
        {extra > 0 && (
          <div style={{
            width: 28, height: 28, borderRadius: '50%',
            background: '#374151', color: 'white',
            border: '2px solid white', marginLeft: -6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, zIndex: 1,
          }}>+{extra}</div>
        )}
        {[...visible].reverse().map((u, i) => {
          const isSelf = u.id === perfil.id
          const unreads = unreadByUser[u.id] || 0
          return (
            <div key={u.id}
              onClick={() => !isSelf && onOpenChat(u)}
              title={isSelf ? `${u.nombre} (vos)` : `Chatear con ${u.nombre}`}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: avatarColor(u.nombre), color: 'white',
                border: `2px solid ${isSelf ? avatarColor(u.nombre) : 'white'}`,
                outline: isSelf ? '2px solid white' : 'none',
                marginLeft: i === visible.length - 1 ? 0 : -6,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 11, fontWeight: 700,
                zIndex: visible.length - i,
                cursor: isSelf ? 'default' : 'pointer',
                position: 'relative',
                transition: 'transform 0.1s',
              }}
              onMouseEnter={e => { if (!isSelf) (e.currentTarget as HTMLElement).style.transform = 'scale(1.15)' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = 'scale(1)' }}
            >
              {u.nombre.charAt(0).toUpperCase()}
              {unreads > 0 && (
                <span style={{
                  position: 'absolute', top: -4, right: -4,
                  background: '#ef4444', color: 'white', borderRadius: '50%',
                  width: 14, height: 14, fontSize: 9, fontWeight: 700,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  border: '1.5px solid white',
                }}>{unreads}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Tooltip */}
      {showTooltip && onlineUsers.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '8px 0',
          minWidth: 190, zIndex: 9999,
        }}>
          <p style={{ margin: '0 0 6px', padding: '0 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {onlineUsers.length} conectado{onlineUsers.length !== 1 ? 's' : ''}
          </p>
          {onlineUsers.map(u => {
            const isSelf = u.id === perfil.id
            return (
              <div key={u.id}
                onClick={() => !isSelf && onOpenChat(u)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 8,
                  padding: '6px 12px', cursor: isSelf ? 'default' : 'pointer',
                  background: 'transparent', transition: 'background 0.1s',
                }}
                onMouseEnter={e => { if (!isSelf) (e.currentTarget as HTMLElement).style.background = '#f9fafb' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
              >
                <div style={{
                  width: 24, height: 24, borderRadius: '50%',
                  background: avatarColor(u.nombre), color: 'white',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700, flexShrink: 0,
                }}>{u.nombre.charAt(0).toUpperCase()}</div>
                <span style={{ fontSize: 13, color: '#374151', fontWeight: isSelf ? 600 : 400, flex: 1 }}>
                  {u.nombre}{isSelf ? ' (vos)' : ''}
                </span>
                {!isSelf && <span style={{ fontSize: 11, color: '#9ca3af' }}>💬</span>}
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
