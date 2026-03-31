import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import ClientesTable from '@/components/ClientesTable'

export const dynamic = 'force-dynamic'

export default async function ClientesPage({ searchParams }: { searchParams: { estado?: string; tipo?: string; q?: string; page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const PAGE = 50

  let query = supabase
    .from('clientes')
    .select('*, responsable:responsable_id(id,nombre,mail)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page*PAGE, (page+1)*PAGE-1)

  if (searchParams.estado) query = query.eq('estado', searchParams.estado)
  if (searchParams.tipo)   query = query.eq('tipo_cliente', searchParams.tipo)
  if (searchParams.q)      query = query.ilike('razon_social', '%' + searchParams.q + '%')

  const { data: clientes, count } = await query
  const { data: responsables } = await supabase.from('perfiles').select('id,nombre,mail').eq('activo',true).order('nombre')
  const { data: conteos } = await supabase.from('clientes').select('estado')
  const cuentaEstados: Record<string,number> = {}
  for (const c of conteos || []) cuentaEstados[c.estado] = (cuentaEstados[c.estado] || 0) + 1

  return (
    <AppShell perfil={perfil}>
      <ClientesTable
        clientes={clientes||[]} totalCount={count||0}
        page={page} pageSize={PAGE}
        cuentaEstados={cuentaEstados}
        filters={{ estado: searchParams.estado, tipo: searchParams.tipo, q: searchParams.q }}
        perfil={perfil} responsables={responsables||[]}
      />
    </AppShell>
  )
}
