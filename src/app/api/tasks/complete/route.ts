import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) return NextResponse.json({ error: 'No profile' }, { status: 401 })

  const { task_template_id, completed, photo_url } = await req.json()
  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase.from('task_logs').upsert({
    task_template_id,
    household_id: profile.household_id,
    log_date: today,
    completed,
    completed_at: completed ? new Date().toISOString() : null,
    completed_by: completed ? user.id : null,
    photo_url: photo_url || null,
  }, { onConflict: 'task_template_id,log_date' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // If one-time task and completed, deactivate it
  if (completed) {
    const { data: template } = await supabase.from('task_templates').select('is_recurring, is_adhoc').eq('id', task_template_id).single()
    if (template && template.is_recurring === false) {
      await supabase.from('task_templates').update({ is_active: false }).eq('id', task_template_id)
    }
  }

  return NextResponse.json({ log: data })
}
