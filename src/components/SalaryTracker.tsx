'use client'
import { useState } from 'react'
import type { Profile, SalarySetting, SalaryAdvance, SalaryPayment } from '@/lib/types'

interface Props { profile: Profile; settings: SalarySetting | null; advances: SalaryAdvance[]; payments: SalaryPayment[] }

export default function SalaryTracker({ profile, settings, advances: initAdv, payments: initPay }: Props) {
  const [advances, setAdvances] = useState(initAdv)
  const [payments, setPayments] = useState(initPay)
  const [salary, setSalary] = useState(settings?.monthly_amount || 0)
  const [salInput, setSalInput] = useState(settings?.monthly_amount?.toString() || '')
  const [advAmt, setAdvAmt] = useState('')
  const [advNote, setAdvNote] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)

  const isAdmin = profile.role === 'admin'
  const isStaff = profile.role === 'staff'
  const totalAdv = advances.reduce((s, a) => s + a.amount, 0)
  const netPay = Math.max(0, salary - totalAdv)

  async function saveSalary() {
    const amt = parseInt(salInput); if (!amt) return
    await fetch('/api/salary/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_amount: amt }) })
    setSalary(amt)
  }

  async function addAdvance() {
    const amt = parseInt(advAmt); if (!amt || amt <= 0) return
    setLoading(true)
    const res = await fetch('/api/salary/advance', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ amount: amt, note: advNote }) })
    const { advance } = await res.json()
    setAdvances(p => [advance, ...p]); setAdvAmt(''); setAdvNote(''); setLoading(false)
  }

  async function deleteAdvance(id: string) {
    await fetch('/api/salary/advance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAdvances(p => p.filter(a => a.id !== id))
  }

  async function markPaid() {
    setLoading(true)
    await fetch('/api/salary/pay', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_amount: salary, advances_total: totalAdv }) })
    setPayments(p => [{ id: Date.now().toString(), household_id: profile.household_id, paid_amount: netPay, advances_deducted: totalAdv, payment_date: new Date().toISOString().split('T')[0], notes: null, created_at: new Date().toISOString() }, ...p.slice(0, 5)])
    setAdvances([]); setShowPayConfirm(false); setLoading(false)
  }

  const S = {
    page: { padding: '28px 20px', minHeight: '100vh' },
    h1: { fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
    sub: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 },
    stat: (col: string) => ({ background: '#fff', borderRadius: 16, padding: '14px 10px', textAlign: 'center' as const, border: '1px solid #f0f0f0' }),
    num: (col: string) => ({ fontSize: 20, fontWeight: 700, color: col, margin: 0 }),
    lbl: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
    card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f9fafb' },
    input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 15, outline: 'none', background: '#fff', fontFamily: 'inherit' },
    flexRow: { display: 'flex', gap: 8, marginBottom: 10 },
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Salary</h1>
      <p style={S.sub}>Track advances and monthly payments</p>

      {isStaff && (
        <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 14, padding: '12px 16px', marginBottom: 20, textAlign: 'center' }}>
          <p style={{ margin: 0, fontWeight: 600, color: '#1d4ed8', fontSize: 14 }}>💰 Your salary summary</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#3b82f6' }}>Ask your admin to update advances</p>
        </div>
      )}

      {/* Summary */}
      <div style={S.grid}>
        <div style={S.stat('#185FA5')}><p style={S.num('#185FA5')}>₹{salary.toLocaleString('en-IN')}</p><p style={S.lbl}>monthly</p></div>
        <div style={S.stat('#dc2626')}><p style={S.num('#dc2626')}>₹{totalAdv.toLocaleString('en-IN')}</p><p style={S.lbl}>advances</p></div>
        <div style={S.stat('#1D9E75')}><p style={S.num('#1D9E75')}>₹{netPay.toLocaleString('en-IN')}</p><p style={S.lbl}>net pay</p></div>
      </div>

      {/* Set salary - admin only */}
      {isAdmin && (
        <div style={{ ...S.card, padding: 16, marginBottom: 20 }}>
          <p style={{ ...S.sectionTitle, marginBottom: 8 }}>Monthly salary (₹)</p>
          <div style={S.flexRow}>
            <input style={{ ...S.input, flex: 1 }} type="number" placeholder="e.g. 12000" value={salInput} onChange={e => setSalInput(e.target.value)} onBlur={saveSalary} />
            <button onClick={saveSalary} style={{ background: '#f3f4f6', border: 'none', borderRadius: 12, padding: '0 16px', cursor: 'pointer', fontSize: 20 }}>✓</button>
          </div>
        </div>
      )}

      {/* Add advance - admin/collaborator only */}
      {!isStaff && (
        <div style={{ ...S.section }}>
          <p style={S.sectionTitle}><i className="ti ti-plus" /> Add advance</p>
          <div style={S.flexRow}>
            <input style={{ ...S.input, width: 120 }} type="number" placeholder="₹ Amount" value={advAmt} onChange={e => setAdvAmt(e.target.value)} />
            <input style={{ ...S.input, flex: 1 }} placeholder="Reason" value={advNote} onChange={e => setAdvNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && addAdvance()} />
          </div>
          <button onClick={addAdvance} disabled={loading} className="hk-btn-primary" style={{ background: '#185FA5' }}>
            {loading ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-plus" />} Add advance
          </button>
        </div>
      )}

      {/* Advance history */}
      <div style={S.section}>
        <p style={S.sectionTitle}><i className="ti ti-history" /> Advance history</p>
        {advances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
            <i className="ti ti-coin-rupee" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No advances this cycle</p>
          </div>
        ) : (
          <div style={S.card}>
            {advances.map((a, i) => (
              <div key={a.id} style={{ ...S.row, borderBottom: i < advances.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>₹{a.amount.toLocaleString('en-IN')}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{a.advance_date}{a.note ? ` · ${a.note}` : ''}</p>
                </div>
                {isAdmin && (
                  <button onClick={() => deleteAdvance(a.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18, padding: 4 }}>
                    <i className="ti ti-trash" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Mark paid - admin only */}
      {isAdmin && (
        <button onClick={() => setShowPayConfirm(true)} className="hk-btn-primary" style={{ marginBottom: 24 }}>
          <i className="ti ti-check" /> Mark salary as paid
        </button>
      )}

      {/* Payment history */}
      {payments.length > 0 && (
        <div style={S.section}>
          <p style={S.sectionTitle}><i className="ti ti-receipt" /> Payment history</p>
          <div style={S.card}>
            {payments.map((p, i) => (
              <div key={p.id} style={{ ...S.row, borderBottom: i < payments.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className="ti ti-check" style={{ color: '#1D9E75', fontSize: 16 }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>₹{p.paid_amount.toLocaleString('en-IN')} paid</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{p.payment_date} · ₹{p.advances_deducted.toLocaleString('en-IN')} deducted</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pay confirm modal */}
      {showPayConfirm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24 }}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <span style={{ fontSize: 48 }}>✅</span>
              <h2 style={{ fontSize: 20, fontWeight: 700, margin: '8px 0 4px' }}>Confirm payment</h2>
              <p style={{ color: '#6b7280', fontSize: 14, margin: 0 }}>
                Salary ₹{salary.toLocaleString('en-IN')} − Advances ₹{totalAdv.toLocaleString('en-IN')}<br />
                <strong>Net payable: ₹{netPay.toLocaleString('en-IN')}</strong>
              </p>
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>All advances will be cleared.</p>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <button onClick={markPaid} disabled={loading} className="hk-btn-primary">
                {loading ? <i className="ti ti-loader-2 spin" /> : null} Confirm — ₹{netPay.toLocaleString('en-IN')} paid
              </button>
              <button onClick={() => setShowPayConfirm(false)} className="hk-btn-secondary">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
