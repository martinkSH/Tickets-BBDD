import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TicketTable from '@/components/TicketTable'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const { data: tickets } = await supabase
    .from('tickets_con_responsable')
    .select('*')
    .order('created_at', { ascending: false })

  const { data: responsables } = await supabase
    .from('perfiles')
    .select('id, nombre, mail')
    .eq('activo', true)
    .order('nombre')

  return (
    <AppShell perfil={perfil}>
      <TicketTable
        tickets={tickets || []}
        responsables={responsables || []}
        perfil={perfil}
        title="Todos los tickets"
        soloMios={false}
      />
    </AppShell>
  )
}
