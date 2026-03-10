'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Ticket, Perfil } from '@/lib/types'
import AppShell from '@/components/AppShell'
import TicketTable from '@/components/TicketTable'

export default function DashboardPage() {
  const [perfil, setPerfil] = useState<Perfil | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [responsables, setResponsables] = useState<any[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const load = async () => {
      // Esperar sesión activa
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { window.location.href = '/login'; return }

      const { data: p } = await supabase.from('perfiles').select('*').eq('id', session.user.id).single()
      if (!p) { window.location.href = '/login'; return }
      setPerfil(p)

      const { data: t } = await supabase
        .from('tickets_con_responsable').select('*').order('created_at', { ascending: false })
      setTickets(t || [])

      const { data: r } = await supabase.from('perfiles').select('id, nombre, mail').eq('activo', true).order('nombre')
      setResponsables(r || [])
      setReady(true)
    }

    load()
  }, [])

  if (!ready || !perfil) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f5f9' }}>
      <div className="text-gray-400 text-sm">Cargando…</div>
    </div>
  )

  return (
    <AppShell perfil={perfil}>
      <TicketTable tickets={tickets} responsables={responsables} perfil={perfil} title="Todos los tickets" soloMios={false} />
    </AppShell>
  )
}
