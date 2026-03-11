'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

const INTERVAL_MS = 2 * 60 * 1000 // 2 minutos

export default function AutoRefresh() {
  const router = useRouter()
  const [countdown, setCountdown] = useState(INTERVAL_MS / 1000)
  const intervalRef = useRef<NodeJS.Timeout>()
  const countRef = useRef<NodeJS.Timeout>()

  useEffect(() => {
    // Refresh cada 2 minutos
    intervalRef.current = setInterval(() => {
      router.refresh()
      setCountdown(INTERVAL_MS / 1000)
    }, INTERVAL_MS)

    // Countdown visual cada segundo
    countRef.current = setInterval(() => {
      setCountdown(c => c <= 1 ? INTERVAL_MS / 1000 : c - 1)
    }, 1000)

    return () => {
      clearInterval(intervalRef.current)
      clearInterval(countRef.current)
    }
  }, [])

  const mins = Math.floor(countdown / 60)
  const secs = countdown % 60

  return (
    <span title="Actualización automática" style={{
      fontSize: 11, color: '#9ca3af', display: 'inline-flex', alignItems: 'center', gap: 4,
      background: '#f9fafb', border: '1px solid #f0f0f0', borderRadius: 20, padding: '3px 10px'
    }}>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10"/>
      </svg>
      {mins}:{secs.toString().padStart(2, '0')}
    </span>
  )
}
