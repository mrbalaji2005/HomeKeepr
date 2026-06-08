import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { full_name, email, password, role } = await req.json()
  if (!full_name || !email || !password || !role) return NextResponse.json({ error: 'All fields required' }, { status: 400 })

  const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password, options: { data: { full_name } } })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 400 })
  if (!auth.user) return NextResponse.json({ error: 'Could not create user' }, { status: 500 })

  const { error: pErr } = await supabase.from('profiles').insert({ id: auth.user.id, household_id: profile.household_id, full_name, email, role })
  if (pErr) return NextResponse.json({ error: pErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
