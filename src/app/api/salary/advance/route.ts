import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { amount, note, is_emi, emi_months } = await req.json()

  if (is_emi && emi_months > 1) {
    const emi_group_id = uuidv4()
    const installment = Math.round(amount / emi_months)
    const today = new Date()

    const rows = Array.from({ length: emi_months }, (_, i) => {
      const d = new Date(today.getFullYear(), today.getMonth() + i, today.getDate())
      return {
        household_id: profile.household_id,
        amount: installment,
        note: `${note || 'EMI'} (${i + 1}/${emi_months})`,
        created_by: user.id,
        is_emi: true,
        emi_total_months: emi_months,
        emi_installment_number: i + 1,
        emi_group_id,
        advance_date: d.toISOString().split('T')[0],
      }
    })

    const { data, error } = await supabase.from('salary_advances').insert(rows).select()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ advances: data, is_emi: true })
  }

  // Regular advance
  const { data, error } = await supabase
    .from('salary_advances')
    .insert({ household_id: profile.household_id, amount, note, created_by: user.id })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ advance: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('salary_advances').delete().eq('id', id).eq('household_id', profile.household_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
