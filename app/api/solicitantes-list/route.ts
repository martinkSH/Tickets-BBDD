import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = createClient()
  const allMails: Record<string, number> = {}
  let from = 0
  while (true) {
    const { data } = await supabase
      .from('tickets').select('mail_solicitante')
      .range(from, from + 999)
    if (!data || data.length === 0) break
    for (const t of data) {
      const m = (t.mail_solicitante || '').trim().toLowerCase()
      if (m && m.includes('@')) allMails[m] = (allMails[m] || 0) + 1
    }
    if (data.length < 1000) break
    from += 1000
  }
  const result = Object.entries(allMails)
    .map(([mail, total]) => ({ mail, total }))
    .sort((a, b) => b.total - a.total)
  return NextResponse.json(result)
}
