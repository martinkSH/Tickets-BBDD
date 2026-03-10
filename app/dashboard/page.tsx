'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const [log, setLog] = useState<string[]>(['Iniciando...'])

  useEffect(() => {
    const supabase = createClient()
    const add = (msg: string) => setLog(prev => [...prev, msg])

    const run = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      add(`Session: ${session?.user?.email}`)

      const { data: perfil, error: e1 } = await supabase.from('perfiles').select('*').eq('id', session!.user.id).single()
      add(`Perfil: ${JSON.stringify(perfil)} error: ${e1?.message}`)

      const { data: tickets, error: e2 } = await supabase.from('tickets_con_responsable').select('*').limit(3)
      add(`Tickets: ${tickets?.length} error: ${e2?.message}`)
    }
    run()
  }, [])

  return (
    <div style={{ padding: 40, fontFamily: 'monospace', background: '#111', color: '#0f0', minHeight: '100vh' }}>
      <h1 style={{ marginBottom: 20 }}>DEBUG</h1>
      {log.map((l, i) => <div key={i} style={{ marginBottom: 8 }}>{l}</div>)}
    </div>
  )
}
