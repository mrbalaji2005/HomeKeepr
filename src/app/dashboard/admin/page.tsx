import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminPanel from '@/components/AdminPanel'

export const dynamic = 'force-dynamic'

export default async function AdminPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*, households(*)').eq('id', user.id).single()
  if (!profile || profile.role === 'staff') redirect('/dashboard')

  const { data: members } = await supabase.from('profiles').select('*').eq('household_id', profile.household_id).order('created_at')
  const { data: templates } = await supabase.from('task_templates').select('*').eq('household_id', profile.household_id).eq('is_active', true).order('scheduled_time', { ascending: true })
  const today = new Date().toISOString().split('T')[0]
  const { data: logs } = await supabase.from('task_logs').select('*').eq('household_id', profile.household_id).eq('log_date', today)

  const tasks = (templates || []).map(t => ({ ...t, log: (logs || []).find(l => l.task_template_id === t.id) || null }))

  return <AdminPanel profile={profile} household={profile.households} members={members || []} tasks={tasks} />
}
