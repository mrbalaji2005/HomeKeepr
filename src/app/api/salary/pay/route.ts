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

  // Get current month advances that are unpaid (no payment_id yet)
  const today = new Date()
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]
  const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split('T')[0]

  const { data: currentAdvances } = await supabase
    .from('salary_advances')
    .select('*')
    .eq('household_id', profile.household_id)
    .is('payment_id', null)
    .gte('advance_date', monthStart)
    .lte('advance_date', monthEnd)

  // Create payment record
  const { data: payment, error: payErr } = await supabase
    .from('salary_payments')
    .insert({
      household_id: profile.household_id,
      paid_amount: net,
      advances_deducted: advances_total,
      payment_date: today.toISOString().split('T')[0],
    })
    .select()
    .single()

  if (payErr) return NextResponse.json({ error: payErr.message }, { status: 500 })

  // Link current advances to this payment instead of deleting
  if (currentAdvances && currentAdvances.length > 0) {
    await supabase
      .from('salary_advances')
      .update({ payment_id: payment.id })
      .in('id', currentAdvances.map((a: any) => a.id))
  }

  return NextResponse.json({ success: true, net, payment })
}
