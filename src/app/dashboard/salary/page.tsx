import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SalaryTracker from '@/components/SalaryTracker'

export const dynamic = 'force-dynamic'

export default async function SalaryPage() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')

  const { data: settings } = await supabase.from('salary_settings').select('*').eq('household_id', profile.household_id).single()
  const { data: advances } = await supabase.from('salary_advances').select('*').eq('household_id', profile.household_id).order('advance_date', { ascending: false })
  const { data: payments } = await supabase.from('salary_payments').select('*').eq('household_id', profile.household_id).order('payment_date', { ascending: false })

  return <SalaryTracker profile={profile} settings={settings} advances={advances || []} payments={payments || []} />
}
