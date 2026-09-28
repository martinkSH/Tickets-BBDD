import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AppShell from '@/components/AppShell'
import TarifariosTable from '@/components/TarifariosTable'
import { filtrarPorCargo, nombreDePila, SIN_ASIGNAR } from '@/lib/tarifarios-cargo'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 100

export default async function TarifariosPage({ searchParams }: {
  searchParams: { page?: string; estado?: string; prioridad?: string; pais?: string; q?: string; cargo?: string }
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
  query = filtrarPorCargo(query, searchParams.cargo)

  const { data: tarifarios, count } = await query.range(from, to)

  // Conteos por estado (todos, sin filtros)
  const { data: responsables } = await supabase
    .from('perfiles')
    .select('id, nombre, mail')
    .eq('activo', true)
    .order('nombre')

  // Conteos por estado y por quién cargó (todos, sin filtros). De a 1000:
  // Supabase no devuelve más por request y hay más tarifarios que eso.
  const cuentaEstados: Record<string, number> = {}
  const cuentaCargo: Record<string, number> = {}
  for (let desde = 0; ; desde += 1000) {
    const { data: conteos } = await supabase
      .from('tarifarios')
      .select('estado, cargo_por')
      .order('id')
      .range(desde, desde + 999)
    for (const t of conteos || []) {
      cuentaEstados[t.estado] = (cuentaEstados[t.estado] || 0) + 1
      const n = nombreDePila(t.cargo_por) || SIN_ASIGNAR
      cuentaCargo[n] = (cuentaCargo[n] || 0) + 1
    }
    if (!conteos || conteos.length < 1000) break
  }

  return (
    <AppShell perfil={perfil}>
      <TarifariosTable
        tarifarios={tarifarios || []}
        totalCount={count || 0}
        page={page}
        pageSize={PAGE_SIZE}
        cuentaEstados={cuentaEstados}
        cuentaCargo={cuentaCargo}
        filters={{
          estado: searchParams.estado,
          prioridad: searchParams.prioridad,
          pais: searchParams.pais,
          q: searchParams.q,
          cargo: searchParams.cargo,
        }}
        perfil={perfil}
        responsables={responsables || []}
      />
    </AppShell>
  )
}
