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
  const [loading, setLoading] = useState(true)
  const [noAuth, setNoAuth] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const load = async (userId: string) => {
      const { data: p } = await supabase.from('perfiles').select('*').eq('id', userId).single()
      if (!p) { setNoAuth(true); return }
      setPerfil(p)
      const { data: t } = await supabase
        .from('tickets_con_responsable').select('*').order('created_at', { ascending: false })
      setTickets(t || [])
      const { data: r } = await supabase.from('perfiles').select('id, nombre, mail').eq('activo', true).order('nombre')
      setResponsables(r || [])
      setLoading(false)
    }

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        load(session.user.id)
      } else {
        setNoAuth(true)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  if (noAuth) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    return null
  }

  if (loading || !perfil) return (
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
