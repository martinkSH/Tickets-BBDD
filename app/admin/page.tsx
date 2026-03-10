import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from '@/components/AdminPanel'
import type { Ticket, Perfil } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('*').eq('id', user.id).single()

  if (perfil?.rol !== 'admin') redirect('/tablero')

  // Todos los tickets
  const { data: tickets } = await supabase
    .from('tickets_con_responsable')
    .select('*')
    .order('created_at', { ascending: false })

  // Todos los responsables (para asignar)
  const { data: responsables } = await supabase
    .from('perfiles')
    .select('*')
    .eq('activo', true)
    .eq('rol', 'responsable')
    .order('nombre')

  return (
    <AdminPanel
      perfil={perfil as Perfil}
      ticketsIniciales={(tickets ?? []) as Ticket[]}
      responsables={(responsables ?? []) as Perfil[]}
    />
  )
}
