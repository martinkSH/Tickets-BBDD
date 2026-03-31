import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import ProveedoresTable from '@/components/ProveedoresTable'

export const dynamic = 'force-dynamic'

export default async function ProveedoresPage({ searchParams }: { searchParams: { estado?: string; q?: string; page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const PAGE = 50

  let query = supabase
    .from('proveedores')
    .select('*, responsable:responsable_id(id, nombre, mail)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE, (page + 1) * PAGE - 1)

  if (searchParams.estado) query = query.eq('estado', searchParams.estado)
  if (searchParams.q) query = query.ilike('razon_social', `%${searchParams.q}%`)

  const { data: proveedores, count } = await query

  const { data: responsables } = await supabase
    .from('perfiles').select('id, nombre, mail').eq('activo', true).order('nombre')

  const { data: conteos } = await supabase.from('proveedores').select('estado')
  const cuentaEstados: Record<string, number> = {}
  for (const p of conteos || []) cuentaEstados[p.estado] = (cuentaEstados[p.estado] || 0) + 1

  return (
    <AppShell perfil={perfil}>
      <ProveedoresTable
        proveedores={proveedores || []}
        totalCount={count || 0}
        page={page} pageSize={PAGE}
        cuentaEstados={cuentaEstados}
        filters={{ estado: searchParams.estado, q: searchParams.q }}
        perfil={perfil}
        responsables={responsables || []}
      />
    </AppShell>
  )
}
