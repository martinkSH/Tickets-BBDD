'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'

interface PresenceUser {
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

export default function OnlineUsers({ perfil }: { perfil: Perfil }) {
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
          // dedup por id
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

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 6 }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}>

      {/* Indicador verde pulsante */}
      <span style={{ position: 'relative', display: 'flex', alignItems: 'center', marginRight: 2 }}>
        <span style={{
          width: 8, height: 8, borderRadius: '50%', background: '#22c55e', display: 'block',
          boxShadow: '0 0 0 0 rgba(34,197,94,0.4)',
          animation: 'pulse-green 2s infinite',
        }} />
      </span>

      {/* Avatares superpuestos */}
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
        {[...visible].reverse().map((u, i) => (
          <div key={u.id} style={{
            width: 28, height: 28, borderRadius: '50%',
            background: avatarColor(u.nombre),
            color: 'white', border: '2px solid white',
            marginLeft: i === visible.length - 1 ? 0 : -6,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 11, fontWeight: 700,
            zIndex: visible.length - i,
            boxShadow: u.id === perfil.id ? `0 0 0 2px ${avatarColor(u.nombre)}` : 'none',
            cursor: 'default',
          }}>
            {u.nombre.charAt(0).toUpperCase()}
          </div>
        ))}
      </div>

      {/* Tooltip con lista */}
      {showTooltip && onlineUsers.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', right: 0, marginTop: 8,
          background: 'white', border: '1px solid #e5e7eb', borderRadius: 10,
          boxShadow: '0 4px 20px rgba(0,0,0,0.12)', padding: '8px 0',
          minWidth: 180, zIndex: 9999,
        }}>
          <p style={{ margin: '0 0 6px', padding: '0 12px', fontSize: 10, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            {onlineUsers.length} conectado{onlineUsers.length !== 1 ? 's' : ''}
          </p>
          {onlineUsers.map(u => (
            <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px' }}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%',
                background: avatarColor(u.nombre), color: 'white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 10, fontWeight: 700, flexShrink: 0,
              }}>
                {u.nombre.charAt(0).toUpperCase()}
              </div>
              <span style={{ fontSize: 13, color: '#374151', fontWeight: u.id === perfil.id ? 600 : 400 }}>
                {u.nombre}{u.id === perfil.id ? ' (vos)' : ''}
              </span>
              <span style={{ marginLeft: 'auto', width: 7, height: 7, borderRadius: '50%', background: '#22c55e', flexShrink: 0 }} />
            </div>
          ))}
        </div>
      )}

      <style>{`
        @keyframes pulse-green {
          0% { box-shadow: 0 0 0 0 rgba(34,197,94,0.5); }
          70% { box-shadow: 0 0 0 6px rgba(34,197,94,0); }
          100% { box-shadow: 0 0 0 0 rgba(34,197,94,0); }
        }
      `}</style>
    </div>
  )
}
