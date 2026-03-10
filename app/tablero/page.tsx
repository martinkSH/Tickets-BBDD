import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TableroResponsable from '@/components/TableroResponsable'
import type { Ticket, Perfil } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function TableroPropioPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()

  if (!perfil) redirect('/login')
  if (perfil.rol === 'admin') redirect('/admin')

  const { data: tickets } = await supabase
    .from('tickets_con_responsable')
    .select('*')
    .eq('responsable_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <TableroResponsable
      perfil={perfil as Perfil}
      ticketsIniciales={(tickets ?? []) as Ticket[]}
    />
  )
}
