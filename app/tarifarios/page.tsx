import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TarifariosTable from '@/components/TarifariosTable'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function TarifariosPage({ searchParams }: {
  searchParams: { page?: string; estado?: string; prioridad?: string; pais?: string; q?: string }
}) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: perfil } = await supabase.from('perfiles').select('*').eq('id', user.id).single()
  if (!perfil) redirect('/login')

  const page = Math.max(0, parseInt(searchParams.page || '0'))
  const from = page * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = supabase
    .from('tarifarios')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (searchParams.estado)    query = query.eq('estado', searchParams.estado)
  if (searchParams.prioridad) query = query.eq('prioridad', searchParams.prioridad)
  if (searchParams.pais)      query = query.eq('pais', searchParams.pais)
  if (searchParams.q)         query = query.ilike('proveedor', `%${searchParams.q}%`)

  const { data: tarifarios, count } = await query.range(from, to)

  // Conteos por estado (todos, sin filtros)
  const { data: responsables } = await supabase
    .from('perfiles')
    .select('id, nombre, mail')
    .eq('activo', true)
    .order('nombre')

  const { data: conteos } = await supabase
    .from('tarifarios')
    .select('estado')
  const cuentaEstados: Record<string, number> = {}
  for (const t of conteos || []) {
    cuentaEstados[t.estado] = (cuentaEstados[t.estado] || 0) + 1
  }

  return (
    <AppShell perfil={perfil}>
      <TarifariosTable
        tarifarios={tarifarios || []}
        totalCount={count || 0}
        page={page}
        pageSize={PAGE_SIZE}
        cuentaEstados={cuentaEstados}
        filters={{
          estado: searchParams.estado,
          prioridad: searchParams.prioridad,
          pais: searchParams.pais,
          q: searchParams.q,
        }}
        perfil={perfil}
        responsables={responsables || []}
      />
    </AppShell>
  )
}
