import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { name, icon, scheduled_time, photo_url, is_recurring } = await req.json()
  const { data, error } = await supabase.from('task_templates').insert({
    household_id: profile.household_id,
    name, icon: icon || 'ti-star',
    scheduled_time: scheduled_time || null,
    photo_url: photo_url || null,
    is_adhoc: true,
    is_recurring: is_recurring !== false,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ task: data })
}

export async function DELETE(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id } = await req.json()
  const { error } = await supabase.from('task_templates').update({ is_active: false }).eq('id', id).eq('household_id', profile.household_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  // Update task time or name
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role === 'staff') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { id, scheduled_time } = await req.json()
  const { error } = await supabase.from('task_templates').update({ scheduled_time }).eq('id', id).eq('household_id', profile.household_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
