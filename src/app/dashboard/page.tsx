import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import TaskBoard from '@/components/TaskBoard'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase.from('profiles').select('*, households(*)').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const today = new Date().toISOString().split('T')[0]

  const { data: templates } = await supabase
    .from('task_templates')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('is_active', true)
    .order('scheduled_time', { ascending: true })

  const { data: logs } = await supabase
    .from('task_logs')
    .select('*')
    .eq('household_id', profile.household_id)
    .eq('log_date', today)

  let tasks = (templates || []).map(t => ({
    ...t,
    log: (logs || []).find(l => l.task_template_id === t.id) || null
  }))

  // Staff: hide all completed tasks (recurring reappear tomorrow, one-time gone forever)
  if (profile.role === 'staff') {
    tasks = tasks.filter(t => !t.log?.completed)
  }

  return (
    <TaskBoard
      tasks={tasks}
      profile={profile}
      householdName={profile.households?.name || 'My Home'}
      today={today}
    />
  )
}
