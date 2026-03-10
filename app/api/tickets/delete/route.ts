import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(req: NextRequest) {
  const { id } = await req.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
  const supabase = createClient()
  const { error } = await supabase.from('tickets').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
