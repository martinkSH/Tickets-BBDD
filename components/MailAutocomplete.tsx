'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  value: string
  onChange: (val: string) => void
  placeholder?: string
  required?: boolean
}

export default function MailAutocomplete({ value, onChange, placeholder, required }: Props) {
  const [suggestions, setSuggestions] = useState<string[]>([])
  const [allMails, setAllMails] = useState<string[]>([])
  const [open, setOpen] = useState(false)
  const [activeIdx, setActiveIdx] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Cargar todos los mails al montar
  useEffect(() => {
    const load = async () => {
      const sb = createClient()
      const { data } = await sb.from('solicitantes').select('mail').order('mail')
      setAllMails(data?.map(d => d.mail) || [])
    }
    load()
  }, [])

  const handleChange = (val: string) => {
    onChange(val)
    setActiveIdx(-1)
    if (val.length < 2) { setSuggestions([]); setOpen(false); return }
    const q = val.toLowerCase()
    const matches = allMails.filter(m => m.toLowerCase().includes(q)).slice(0, 8)
    setSuggestions(matches)
    setOpen(matches.length > 0)
  }

  const select = (mail: string) => {
    onChange(mail)
    setSuggestions([])
    setOpen(false)
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open) return
    if (e.key === 'ArrowDown') { e.preventDefault(); setActiveIdx(i => Math.min(i + 1, suggestions.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActiveIdx(i => Math.max(i - 1, -1)) }
    if (e.key === 'Enter' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]) }
    if (e.key === 'Escape') { setOpen(false) }
    if (e.key === 'Tab' && activeIdx >= 0) { e.preventDefault(); select(suggestions[activeIdx]) }
  }

  // Registrar mail nuevo al salir del campo si no existe
  const handleBlur = async () => {
    setTimeout(() => setOpen(false), 150)
    if (!value || !value.includes('@')) return
    if (allMails.includes(value.toLowerCase())) return
    // Mail nuevo → registrar
    const sb = createClient()
    await sb.from('solicitantes').insert({ mail: value.toLowerCase() }).throwOnError().catch(() => {})
    setAllMails(prev => [...prev, value.toLowerCase()].sort())
  }

  return (
    <div style={{ position: 'relative' }}>
      <input
        ref={inputRef}
        type="email"
        required={required}
        value={value}
        onChange={e => handleChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => value.length >= 2 && suggestions.length > 0 && setOpen(true)}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete="off"
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
      />

      {open && suggestions.length > 0 && (
        <div ref={listRef} style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 9999,
          background: 'white', border: '1px solid #e2e8f0', borderRadius: 10,
          boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 4, overflow: 'hidden',
        }}>
          {suggestions.map((m, i) => {
            const q = value.toLowerCase()
            const idx = m.toLowerCase().indexOf(q)
            return (
              <div key={m}
                onMouseDown={() => select(m)}
                style={{
                  padding: '9px 14px', fontSize: 13, cursor: 'pointer',
                  background: i === activeIdx ? '#f0f4ff' : 'white',
                  borderBottom: i < suggestions.length - 1 ? '1px solid #f8fafc' : 'none',
                  display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={() => setActiveIdx(i)}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                  <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                </svg>
                <span>
                  {idx >= 0 ? (
                    <>
                      {m.slice(0, idx)}
                      <strong style={{ color: '#4f6ef7' }}>{m.slice(idx, idx + q.length)}</strong>
                      {m.slice(idx + q.length)}
                    </>
                  ) : m}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
