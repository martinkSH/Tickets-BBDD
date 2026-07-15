import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TematicasTable from '@/components/TematicasTable'

export const dynamic = 'force-dynamic'

export default async function TematicasPage({ searchParams }: { searchParams: { estado?: string; q?: string; tematica?: string; page?: string } }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const PAGE = 50

  let query = supabase
    .from('tematicas_especiales')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(page * PAGE, (page + 1) * PAGE - 1)

  if (searchParams.estado) query = query.eq('estado', searchParams.estado)
  if (searchParams.tematica) query = query.eq('tematica', searchParams.tematica)
  if (searchParams.q) query = query.ilike('proveedor', `%${searchParams.q}%`)

  const { data: tematicas, count } = await query

  const { data: conteos } = await supabase.from('tematicas_especiales').select('estado')
  const cuentaEstados: Record<string, number> = {}
  for (const t of conteos || []) cuentaEstados[t.estado] = (cuentaEstados[t.estado] || 0) + 1

  return (
    <AppShell perfil={perfil}>
      <TematicasTable
        tematicas={tematicas || []}
        totalCount={count || 0}
        page={page} pageSize={PAGE}
        cuentaEstados={cuentaEstados}
        filters={{ estado: searchParams.estado, q: searchParams.q, tematica: searchParams.tematica }}
        perfil={perfil}
      />
    </AppShell>
  )
}
