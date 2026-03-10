'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [log, setLog] = useState<string[]>(['Iniciando...'])

  useEffect(() => {
    const supabase = createClient()
    const add = (msg: string) => setLog(prev => [...prev, msg])

    supabase.auth.getSession().then(({ data, error }) => {
      add(`getSession: ${JSON.stringify(data?.session?.user?.email)} error: ${error?.message}`)
    })

    supabase.auth.getUser().then(({ data, error }) => {
      add(`getUser: ${JSON.stringify(data?.user?.email)} error: ${error?.message}`)
    })

    const keys = Object.keys(localStorage).filter(k => k.includes('supabase'))
    add(`localStorage keys: ${keys.join(', ') || 'ninguno'}`)
  }, [])

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 20 }}>DEBUG</h1>
      {log.map((l, i) => <div key={i} style={{ marginBottom: 8 }}>{l}</div>)}
    </div>
  )
}
