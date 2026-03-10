import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TicketTable from '@/components/TicketTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function MisTicketsPage({ searchParams }: { searchParams: { page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data: tickets, count } = await supabase
    .from('tickets_con_responsable')
    .select('*', { count: 'exact' })
    .eq('responsable_id', user.id)
    .order('created_at', { ascending: false })
    .range(from, to)

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
        title="Mis tickets"
        soloMios={true}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={count || 0}
      />
    </AppShell>
  )
}
