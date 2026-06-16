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
  const [isEmi, setIsEmi] = useState(false)
  const [emiMonths, setEmiMonths] = useState('2')
  const [loading, setLoading] = useState(false)
  const [showPayConfirm, setShowPayConfirm] = useState(false)
  const [expandedPayment, setExpandedPayment] = useState<string | null>(null)

  const isAdmin = profile.role === 'admin'
  const isStaff = profile.role === 'staff'

  // Current cycle = advances with no payment_id
  const currentAdvances = advances.filter(a => !a.payment_id)
  const totalAdv = currentAdvances.reduce((s, a) => s + a.amount, 0)
  const netPay = Math.max(0, salary - totalAdv)

  async function saveSalary() {
    const amt = parseInt(salInput); if (!amt) return
    await fetch('/api/salary/settings', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ monthly_amount: amt }) })
    setSalary(amt)
  }

  async function addAdvance() {
    const amt = parseInt(advAmt); if (!amt || amt <= 0) return
    setLoading(true)
    const res = await fetch('/api/salary/advance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: amt, note: advNote, is_emi: isEmi, emi_months: isEmi ? parseInt(emiMonths) : 1 })
    })
    const data = await res.json()
    if (data.is_emi) {
      setAdvances(p => [...data.advances, ...p])
    } else {
      setAdvances(p => [data.advance, ...p])
    }
    setAdvAmt(''); setAdvNote(''); setIsEmi(false); setEmiMonths('2'); setLoading(false)
  }

  async function deleteAdvance(id: string) {
    await fetch('/api/salary/advance', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setAdvances(p => p.filter(a => a.id !== id))
  }

  async function markPaid() {
    setLoading(true)
    const res = await fetch('/api/salary/pay', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ monthly_amount: salary, advances_total: totalAdv })
    })
    const { payment } = await res.json()
    // Link advances to payment in local state
    setAdvances(p => p.map(a => !a.payment_id ? { ...a, payment_id: payment.id } : a))
    setPayments(p => [payment, ...p])
    setShowPayConfirm(false); setLoading(false)
  }

  // Group advances by payment_id for history view
  function getAdvancesForPayment(paymentId: string) {
    return advances.filter(a => a.payment_id === paymentId)
  }

  const S = {
    page: { padding: '28px 20px', minHeight: '100vh' },
    h1: { fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
    sub: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
    grid: { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 },
    stat: { background: '#fff', borderRadius: 16, padding: '14px 10px', textAlign: 'center' as const, border: '1px solid #f0f0f0' },
    num: (col: string) => ({ fontSize: 20, fontWeight: 700, color: col, margin: 0 }),
    lbl: { fontSize: 11, color: '#9ca3af', marginTop: 3 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 14, fontWeight: 600, color: '#374151', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 },
    card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: '1px solid #f9fafb' },
    input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 15, outline: 'none', background: '#fff', fontFamily: 'inherit' },
    flexRow: { display: 'flex', gap: 8, marginBottom: 10 },
    toggle: (on: boolean) => ({
      display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
      background: on ? '#eff6ff' : '#f9fafb',
      border: `1.5px solid ${on ? '#93c5fd' : '#e5e7eb'}`,
      borderRadius: 12, padding: '8px 14px', fontSize: 13,
      color: on ? '#1d4ed8' : '#6b7280', fontWeight: on ? 600 : 400,
      userSelect: 'none' as const,
    }),
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
        <div style={S.stat}><p style={S.num('#185FA5')}>₹{salary.toLocaleString('en-IN')}</p><p style={S.lbl}>monthly</p></div>
        <div style={S.stat}><p style={S.num('#dc2626')}>₹{totalAdv.toLocaleString('en-IN')}</p><p style={S.lbl}>advances</p></div>
        <div style={S.stat}><p style={S.num('#1D9E75')}>₹{netPay.toLocaleString('en-IN')}</p><p style={S.lbl}>net pay</p></div>
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
        <div style={S.section}>
          <p style={S.sectionTitle}><i className="ti ti-plus" /> Add advance</p>
          <div style={S.flexRow}>
            <input style={{ ...S.input, width: 120 }} type="number" placeholder="₹ Amount" value={advAmt} onChange={e => setAdvAmt(e.target.value)} />
            <input style={{ ...S.input, flex: 1 }} placeholder="Reason" value={advNote} onChange={e => setAdvNote(e.target.value)} onKeyDown={e => e.key === 'Enter' && !isEmi && addAdvance()} />
          </div>

          {/* EMI toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
            <div style={S.toggle(isEmi)} onClick={() => setIsEmi(p => !p)}>
              <i className={`ti ti-${isEmi ? 'check' : 'calendar-repeat'}`} />
              Split into EMI
            </div>
            {isEmi && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <input
                  type="number"
                  min={2} max={12}
                  value={emiMonths}
                  onChange={e => setEmiMonths(e.target.value)}
                  style={{ ...S.input, width: 60, padding: '8px 10px', fontSize: 14 }}
                />
                <span style={{ fontSize: 13, color: '#6b7280' }}>months</span>
              </div>
            )}
          </div>

          {isEmi && advAmt && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: '8px 12px', marginBottom: 10, fontSize: 13, color: '#92400e' }}>
              ₹{Math.round(parseInt(advAmt || '0') / parseInt(emiMonths || '2')).toLocaleString('en-IN')} / month × {emiMonths} months
            </div>
          )}

          <button onClick={addAdvance} disabled={loading} className="hk-btn-primary" style={{ background: '#185FA5' }}>
            {loading ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-plus" />} {isEmi ? `Add EMI (${emiMonths} months)` : 'Add advance'}
          </button>
        </div>
      )}

      {/* Current cycle advances */}
      <div style={S.section}>
        <p style={S.sectionTitle}><i className="ti ti-history" /> This month's advances</p>
        {currentAdvances.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9ca3af' }}>
            <i className="ti ti-coin-rupee" style={{ fontSize: 40, display: 'block', marginBottom: 8, opacity: 0.4 }} />
            <p style={{ margin: 0, fontSize: 14 }}>No advances this cycle</p>
          </div>
        ) : (
          <div style={S.card}>
            {currentAdvances.map((a, i) => (
              <div key={a.id} style={{ ...S.row, borderBottom: i < currentAdvances.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>₹{a.amount.toLocaleString('en-IN')}</p>
                    {a.is_emi && (
                      <span style={{ fontSize: 10, background: '#eff6ff', color: '#1d4ed8', borderRadius: 6, padding: '2px 6px', fontWeight: 600 }}>
                        EMI {a.emi_installment_number}/{a.emi_total_months}
                      </span>
                    )}
                  </div>
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

      {/* Payment history with advance breakup */}
      {payments.length > 0 && (
        <div style={S.section}>
          <p style={S.sectionTitle}><i className="ti ti-receipt" /> Payment history</p>
          <div style={S.card}>
            {payments.map((p, i) => {
              const payAdv = getAdvancesForPayment(p.id)
              const isExpanded = expandedPayment === p.id
              return (
                <div key={p.id} style={{ borderBottom: i < payments.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                  <div
                    style={{ ...S.row, cursor: 'pointer' }}
                    onClick={() => setExpandedPayment(isExpanded ? null : p.id)}
                  >
                    <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="ti ti-check" style={{ color: '#1D9E75', fontSize: 16 }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 600, color: '#111827' }}>₹{p.paid_amount.toLocaleString('en-IN')} paid</p>
                      <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>
                        {p.payment_date} · ₹{p.advances_deducted.toLocaleString('en-IN')} deducted
                      </p>
                    </div>
                    <i className={`ti ti-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#9ca3af', fontSize: 16 }} />
                  </div>

                  {/* Advance breakup */}
                  {isExpanded && (
                    <div style={{ background: '#f9fafb', padding: '8px 16px 12px' }}>
                      {payAdv.length === 0 ? (
                        <p style={{ fontSize: 12, color: '#9ca3af', margin: '4px 0' }}>No advance details available</p>
                      ) : (
                        <>
                          <p style={{ fontSize: 11, fontWeight: 600, color: '#9ca3af', margin: '4px 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Advance breakup</p>
                          {payAdv.map(a => (
                            <div key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: '1px solid #f0f0f0' }}>
                              <div>
                                <p style={{ margin: 0, fontSize: 13, color: '#374151' }}>{a.note || 'Advance'}</p>
                                <p style={{ margin: 0, fontSize: 11, color: '#9ca3af' }}>{a.advance_date}{a.is_emi ? ` · EMI ${a.emi_installment_number}/${a.emi_total_months}` : ''}</p>
                              </div>
                              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#dc2626' }}>−₹{a.amount.toLocaleString('en-IN')}</p>
                            </div>
                          ))}
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8 }}>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#374151' }}>Total deducted</p>
                            <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#dc2626' }}>−₹{p.advances_deducted.toLocaleString('en-IN')}</p>
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
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
              <p style={{ fontSize: 12, color: '#9ca3af', marginTop: 6 }}>Advances will be archived, not deleted.</p>
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
