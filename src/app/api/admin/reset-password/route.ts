import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { member_email, new_password } = await req.json()
  if (!member_email || !new_password || new_password.length < 6) return NextResponse.json({ error: 'Invalid input' }, { status: 400 })

  // Verify member belongs to same household
  const { data: member } = await supabase.from('profiles').select('*').eq('email', member_email).eq('household_id', profile.household_id).single()
  if (!member) return NextResponse.json({ error: 'Member not found in your household' }, { status: 404 })

  // Update password via SQL
  const { error } = await supabase.rpc('admin_update_password', { p_email: member_email, p_password: new_password })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
