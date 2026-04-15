import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TicketsITTable from '@/components/TicketsITTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function TicketsITPage({ searchParams }: {
  searchParams: { page?: string; estado?: string; sistema?: string; q?: string; responsable?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  // Solo IT y admins
  const rolesPermitidos = ['admin', 'responsable IT', 'responsable IT/BBDD']
  if (!rolesPermitidos.includes(perfil.rol)) redirect('/dashboard')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('tickets_it')
    .select('*, responsable:responsable_id(id,nombre,mail)', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (searchParams.estado)      query = query.eq('estado', searchParams.estado)
  if (searchParams.sistema)     query = query.eq('sistema', searchParams.sistema)
  if (searchParams.responsable) query = query.eq('responsable_id', searchParams.responsable)
  if (searchParams.q)           query = query.ilike('mail_solicitante', '%' + searchParams.q + '%')

  const { data: tickets, count } = await query.range(from, to)

  // Solo responsables IT para el panel
  const { data: responsables } = await supabase.from('perfiles')
    .select('id,nombre,mail')
    .eq('activo', true)
    .in('rol', ['responsable IT','responsable IT/BBDD','admin'])
    .order('nombre')

  const { data: conteos } = await supabase.from('tickets_it').select('estado')
  const cuentaEstados: Record<string,number> = {}
  for (const t of conteos||[]) cuentaEstados[t.estado] = (cuentaEstados[t.estado]||0)+1

  // Abiertos por responsable
  const { data: abiertosData } = await supabase.from('tickets_it')
    .select('responsable_id').neq('estado','Resuelto').not('responsable_id','is',null)
  const ticketsPorResponsable: Record<string,number> = {}
  for (const t of abiertosData||[]) {
    ticketsPorResponsable[t.responsable_id] = (ticketsPorResponsable[t.responsable_id]||0)+1
  }

  return (
    <AppShell perfil={perfil}>
      <TicketsITTable
        tickets={tickets||[]} totalCount={count||0}
        page={page} pageSize={PAGE_SIZE}
        cuentaEstados={cuentaEstados}
        filters={{ estado: searchParams.estado, sistema: searchParams.sistema, q: searchParams.q, responsable: searchParams.responsable }}
        perfil={perfil} responsables={responsables||[]}
        ticketsPorResponsable={ticketsPorResponsable}
      />
    </AppShell>
  )
}
