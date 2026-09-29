import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TicketTable from '@/components/TicketTable'
import { filtrarTickets, contarPorEstado } from '@/lib/tickets-filtros'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function DashboardPage({ searchParams }: { searchParams: { page?: string; responsable?: string; q?: string; estado?: string; area?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const responsableFilter = searchParams.responsable || null
  const filtros = {
    q: searchParams.q, estado: searchParams.estado, area: searchParams.area,
    responsable: responsableFilter,
  }

  const query = filtrarTickets(
    supabase.from('tickets_con_responsable').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    filtros,
  )

  const [{ data: tickets, count }, conteosEstado] = await Promise.all([
    query.range(from, to),
    contarPorEstado(supabase, filtros),
  ])

  const { data: responsables } = await supabase
    .from('perfiles')
    .select('id, nombre, mail')
    .eq('activo', true)
    .order('nombre')

  // Contar tickets abiertos por responsable (para el panel). "Abierto" es
  // trabajo pendiente: los que esperan la conformidad del solicitante ya
  // están resueltos y no son carga del responsable.
  const { data: countData } = await supabase
    .from('tickets_con_responsable')
    .select('responsable_id')
    .is('fecha_resolucion', null)

  const ticketsPorResponsable: Record<string, number> = {}
  for (const t of countData || []) {
    if (t.responsable_id) {
      ticketsPorResponsable[t.responsable_id] = (ticketsPorResponsable[t.responsable_id] || 0) + 1
    }
  }

  return (
    <AppShell perfil={perfil}>
      <TicketTable
        tickets={tickets || []}
        responsables={responsables || []}
        perfil={perfil}
        title="Todos los tickets"
        soloMios={false}
        page={page}
        pageSize={PAGE_SIZE}
        totalCount={count || 0}
        responsableFilter={responsableFilter}
        filtros={{ q: searchParams.q, estado: searchParams.estado, area: searchParams.area }}
        conteosEstado={conteosEstado}
        ticketsPorResponsable={ticketsPorResponsable}
      />
    </AppShell>
  )
}
