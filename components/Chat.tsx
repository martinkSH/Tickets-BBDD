'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Perfil } from '@/lib/types'

interface Message {
  id: string
  from_id: string
  from_nombre: string
  to_id: string
  text: string
  created_at: string
}

interface ChatWindow {
  user: { id: string; nombre: string }
  open: boolean
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
  windows: ChatWindow[]
  setWindows: React.Dispatch<React.SetStateAction<ChatWindow[]>>
  unreadByUser: Record<string, number>
  setUnreadByUser: React.Dispatch<React.SetStateAction<Record<string, number>>>
}

export default function Chat({ perfil, windows, setWindows, unreadByUser, setUnreadByUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const channelRef = useRef<any>(null)
  const sb = createClient()

  useEffect(() => {
    const channel = sb.channel('internal-chat')
    channel.on('broadcast', { event: 'msg' }, ({ payload }: any) => {
      const msg = payload as Message
      if (msg.to_id !== perfil.id && msg.from_id !== perfil.id) return
      setMessages(prev => prev.find(m => m.id === msg.id) ? prev : [...prev, msg])

      if (msg.to_id === perfil.id) {
        setWindows(prev => {
          const exists = prev.find(w => w.user.id === msg.from_id)
          if (!exists) {
            setUnreadByUser(u => ({ ...u, [msg.from_id]: (u[msg.from_id] || 0) + 1 }))
            return [...prev, { user: { id: msg.from_id, nombre: msg.from_nombre }, open: false }]
          }
          if (!exists.open) {
            setUnreadByUser(u => ({ ...u, [msg.from_id]: (u[msg.from_id] || 0) + 1 }))
          }
          return prev
        })
      }
    })
    channel.subscribe()
    channelRef.current = channel
    return () => { sb.removeChannel(channel) }
  }, [perfil.id])

  const sendMessage = async (toId: string, toNombre: string, text: string) => {
    if (!text.trim()) return
    const msg: Message = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      from_id: perfil.id, from_nombre: perfil.nombre,
      to_id: toId, text: text.trim(),
      created_at: new Date().toISOString(),
    }
    setMessages(prev => [...prev, msg])
    await channelRef.current?.send({ type: 'broadcast', event: 'msg', payload: msg })
  }

  const getConv = (userId: string) =>
    messages.filter(m =>
      (m.from_id === perfil.id && m.to_id === userId) ||
      (m.from_id === userId && m.to_id === perfil.id)
    ).sort((a, b) => a.created_at.localeCompare(b.created_at))

  const openWindows = windows.filter(w => w.open)
  const closedWindows = windows.filter(w => !w.open)

  return (
    <>
      {/* Ventanas abiertas - de derecha a izquierda */}
      {openWindows.map((w, i) => (
        <ChatWindowComp
          key={w.user.id}
          user={w.user}
          perfil={perfil}
          messages={getConv(w.user.id)}
          rightOffset={16 + i * 316}
          onClose={() => setWindows(prev => prev.map(x => x.user.id === w.user.id ? { ...x, open: false } : x))}
          onSend={(text) => sendMessage(w.user.id, w.user.nombre, text)}
        />
      ))}

      {/* Ventanas minimizadas */}
      <div style={{ position: 'fixed', bottom: 12, right: 16 + openWindows.length * 316, display: 'flex', gap: 8, zIndex: 999, alignItems: 'flex-end' }}>
        {closedWindows.map(w => (
          <button key={w.user.id}
            onClick={() => {
              setWindows(prev => prev.map(x => x.user.id === w.user.id ? { ...x, open: true } : x))
              setUnreadByUser(u => ({ ...u, [w.user.id]: 0 }))
            }}
            title={w.user.nombre}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              background: avatarColor(w.user.nombre), color: 'white',
              border: '3px solid white', cursor: 'pointer', fontSize: 16, fontWeight: 700,
              boxShadow: '0 2px 12px rgba(0,0,0,0.25)', position: 'relative',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
            {w.user.nombre.charAt(0)}
            {(unreadByUser[w.user.id] || 0) > 0 && (
              <span style={{
                position: 'absolute', top: -4, right: -4,
                background: '#ef4444', color: 'white', borderRadius: '50%',
                width: 18, height: 18, fontSize: 10, fontWeight: 700,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                border: '2px solid white',
              }}>{unreadByUser[w.user.id]}</span>
            )}
          </button>
        ))}
      </div>
    </>
  )
}

function ChatWindowComp({ user, perfil, messages, rightOffset, onClose, onSend }: {
  user: { id: string; nombre: string }
  perfil: Perfil
  messages: Message[]
  rightOffset: number
  onClose: () => void
  onSend: (text: string) => void
}) {
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const color = avatarColor(user.nombre)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = () => { if (text.trim()) { onSend(text); setText('') } }

  const formatTime = (iso: string) =>
    new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })

  return (
    <div style={{
      position: 'fixed', bottom: 0, right: rightOffset, width: 300,
      zIndex: 1000, borderRadius: '12px 12px 0 0', overflow: 'hidden',
      display: 'flex', flexDirection: 'column',
      boxShadow: '0 -2px 20px rgba(0,0,0,0.15), 0 4px 24px rgba(0,0,0,0.1)',
    }}>
      {/* Header */}
      <div style={{ background: color, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'rgba(255,255,255,0.25)', color: 'white',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 12, fontWeight: 700, flexShrink: 0,
        }}>{user.nombre.charAt(0)}</div>
        <span style={{ color: 'white', fontWeight: 600, fontSize: 13, flex: 1 }}>{user.nombre}</span>
        <button onClick={onClose} style={{
          background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '50%',
          width: 22, height: 22, color: 'white', cursor: 'pointer', fontSize: 14,
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Mensajes */}
      <div style={{
        height: 260, overflowY: 'auto', background: '#f3f4f6',
        padding: '10px', display: 'flex', flexDirection: 'column', gap: 5,
      }}>
        {messages.length === 0 && (
          <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: 12, margin: 'auto 0' }}>
            Iniciá la conversación 👋
          </p>
        )}
        {messages.map(m => {
          const mine = m.from_id === perfil.id
          return (
            <div key={m.id} style={{ display: 'flex', justifyContent: mine ? 'flex-end' : 'flex-start' }}>
              <div style={{
                maxWidth: '82%', padding: '7px 10px',
                borderRadius: mine ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                background: mine ? color : 'white',
                color: mine ? 'white' : '#1f2937',
                fontSize: 13, lineHeight: 1.45,
                boxShadow: '0 1px 2px rgba(0,0,0,0.08)',
              }}>
                <p style={{ margin: 0, wordBreak: 'break-word' }}>{m.text}</p>
                <p style={{ margin: '2px 0 0', fontSize: 10, opacity: 0.65, textAlign: 'right' }}>{formatTime(m.created_at)}</p>
              </div>
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ background: 'white', borderTop: '1px solid #e5e7eb', padding: '8px 10px', display: 'flex', gap: 6, alignItems: 'flex-end' }}>
        <textarea value={text} onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
          placeholder="Mensaje… (Enter para enviar)"
          rows={1}
          style={{
            flex: 1, border: '1px solid #e5e7eb', borderRadius: 8,
            padding: '7px 10px', fontSize: 12, resize: 'none', outline: 'none',
            fontFamily: 'inherit', lineHeight: 1.4, maxHeight: 80, overflowY: 'auto',
          }}
        />
        <button onClick={handleSend} style={{
          background: color, border: 'none', borderRadius: 8,
          width: 34, height: 34, flexShrink: 0, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
    </div>
  )
}
