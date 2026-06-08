import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const { monthly_amount, advances_total } = await req.json()
  const net = Math.max(0, monthly_amount - advances_total)
  await supabase.from('salary_payments').insert({ household_id: profile.household_id, paid_amount: net, advances_deducted: advances_total })
  await supabase.from('salary_advances').delete().eq('household_id', profile.household_id)
  return NextResponse.json({ success: true, net })
}
