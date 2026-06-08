'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [step, setStep] = useState<'account' | 'household'>('account')
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [householdName, setHouseholdName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (step === 'account') { setStep('household'); return }

    setLoading(true); setError('')
    try {
      const { data: auth, error: authErr } = await supabase.auth.signUp({ email, password, options: { data: { full_name: fullName } } })
      if (authErr) throw new Error(authErr.message)
      if (!auth.user) throw new Error('Signup failed')

      const { data: hh, error: hhErr } = await supabase.from('households').insert({ name: householdName }).select().single()
      if (hhErr) throw new Error(hhErr.message)

      const { error: pErr } = await supabase.from('profiles').insert({ id: auth.user.id, household_id: hh.id, full_name: fullName, email, role: 'admin' })
      if (pErr) throw new Error(pErr.message)

      await supabase.rpc('seed_default_tasks', { p_household_id: hh.id })
      await supabase.from('salary_settings').insert({ household_id: hh.id, monthly_amount: 0 })
      await supabase.auth.signInWithPassword({ email, password })
      router.push('/dashboard')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: 72, height: 72, background: '#1D9E75', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
            <i className="ti ti-home" style={{ fontSize: 36, color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>HomeKeepr</h1>
          <p style={{ color: '#6b7280', marginTop: 6, fontSize: 15 }}>{step === 'account' ? 'Create your account' : 'Name your household'}</p>
        </div>

        {/* Step indicator */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: '#1D9E75' }} />
          <div style={{ flex: 1, height: 4, borderRadius: 99, background: step === 'household' ? '#1D9E75' : '#e5e7eb' }} />
        </div>

        <div className="hk-card" style={{ padding: 24 }}>
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="hk-error"><i className="ti ti-alert-circle" />{error}</div>}
            {step === 'account' ? (
              <>
                <div>
                  <label className="hk-label">Your full name</label>
                  <input className="hk-input" placeholder="e.g. Balaji Mohan" value={fullName} onChange={e => setFullName(e.target.value)} required />
                </div>
                <div>
                  <label className="hk-label">Email</label>
                  <input type="email" className="hk-input" placeholder="your@email.com" value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
                </div>
                <div>
                  <label className="hk-label">Password</label>
                  <input type="password" className="hk-input" placeholder="Min 6 characters" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} autoComplete="new-password" />
                </div>
                <button type="submit" className="hk-btn-primary">
                  <i className="ti ti-arrow-right" /> Continue
                </button>
              </>
            ) : (
              <>
                <div>
                  <label className="hk-label">Household name</label>
                  <input className="hk-input" placeholder="e.g. Balaji Residence" value={householdName} onChange={e => setHouseholdName(e.target.value)} required autoFocus />
                  <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>You'll add family and staff from inside the app.</p>
                </div>
                <button type="submit" className="hk-btn-primary" disabled={loading}>
                  {loading ? <><i className="ti ti-loader-2 spin" /> Creating...</> : <><i className="ti ti-check" /> Create household</>}
                </button>
                <button type="button" className="hk-btn-secondary" onClick={() => setStep('account')}>
                  <i className="ti ti-arrow-left" /> Back
                </button>
              </>
            )}
          </form>
        </div>
        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 24 }}>
          Already have an account? <a href="/login" style={{ color: '#1D9E75', fontWeight: 600 }}>Sign in</a>
        </p>
      </div>
    </div>
  )
}
