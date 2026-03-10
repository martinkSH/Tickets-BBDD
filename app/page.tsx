import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (!user || error) redirect('/login')

  const { data: perfil } = await supabase
    .from('perfiles').select('rol').eq('id', user.id).single()

  if (!perfil) redirect('/login')
  if (perfil.rol === 'admin') redirect('/admin')
  redirect('/tablero')
}
