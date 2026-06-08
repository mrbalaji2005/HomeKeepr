'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) { setError('Wrong email or password.'); setLoading(false) }
    else router.push('/dashboard')
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#f9fafb' }}>
      <div style={{ width: '100%', maxWidth: '380px' }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: 72, height: 72, background: '#1D9E75', borderRadius: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 4px 12px rgba(29,158,117,0.3)' }}>
            <i className="ti ti-home" style={{ fontSize: 36, color: 'white' }} />
          </div>
          <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', margin: 0 }}>HomeKeepr</h1>
          <p style={{ color: '#6b7280', marginTop: 6, fontSize: 15 }}>Sign in to your home</p>
        </div>

        <div className="hk-card" style={{ padding: 24 }}>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {error && <div className="hk-error"><i className="ti ti-alert-circle" />{error}</div>}
            <div>
              <label className="hk-label">Email</label>
              <input type="email" className="hk-input" placeholder="your@email.com"
                value={email} onChange={e => setEmail(e.target.value)} required autoComplete="email" />
            </div>
            <div>
              <label className="hk-label">Password</label>
              <input type="password" className="hk-input" placeholder="••••••••"
                value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
            </div>
            <button type="submit" className="hk-btn-primary" disabled={loading}>
              {loading ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-login" />}
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>

        <p style={{ textAlign: 'center', fontSize: 13, color: '#9ca3af', marginTop: 24 }}>
          New household?{' '}
          <a href="/signup" style={{ color: '#1D9E75', fontWeight: 600 }}>Create account</a>
        </p>
      </div>
    </div>
  )
}
