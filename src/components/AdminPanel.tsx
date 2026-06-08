'use client'
import { useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { Profile, TaskWithLog, Household } from '@/lib/types'

const TIMES = ['5:00 AM','5:30 AM','6:00 AM','6:30 AM','7:00 AM','7:30 AM','8:00 AM','8:30 AM','9:00 AM','9:30 AM','10:00 AM','10:30 AM','11:00 AM','11:30 AM','12:00 PM','12:30 PM','1:00 PM','1:30 PM','2:00 PM','2:30 PM','3:00 PM','3:30 PM','4:00 PM','4:30 PM','5:00 PM','5:30 PM','6:00 PM','6:30 PM','7:00 PM','7:30 PM','8:00 PM','8:30 PM','9:00 PM']

const COLOURS = ['#f97316','#3b82f6','#a855f7','#ec4899','#14b8a6','#eab308','#ef4444','#6366f1']

const ROLE_STYLE: Record<string, { bg: string; color: string }> = {
  admin: { bg: '#f3e8ff', color: '#7e22ce' },
  collaborator: { bg: '#eff6ff', color: '#1d4ed8' },
  staff: { bg: '#fef9c3', color: '#a16207' },
}

interface Props { profile: Profile; household: Household; members: Profile[]; tasks: TaskWithLog[] }

export default function AdminPanel({ profile, household, members, tasks: initTasks }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<'overview' | 'tasks' | 'members'>('overview')
  const [tasks, setTasks] = useState(initTasks)

  // Task management
  const [taskName, setTaskName] = useState('')
  const [taskTime, setTaskTime] = useState('9:00 AM')
  const [taskType, setTaskType] = useState<'recurring' | 'one-time'>('recurring')
  const [taskPhoto, setTaskPhoto] = useState<string | null>(null)
  const [taskPhotoFile, setTaskPhotoFile] = useState<File | null>(null)
  const [editingTimeId, setEditingTimeId] = useState<string | null>(null)
  const [loadingTask, setLoadingTask] = useState(false)
  const photoRef = useRef<HTMLInputElement>(null)

  // Member management
  const [memberName, setMemberName] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberPassword, setMemberPassword] = useState('')
  const [memberRole, setMemberRole] = useState<'collaborator' | 'staff'>('staff')
  const [loadingMember, setLoadingMember] = useState(false)
  const [memberMsg, setMemberMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Password reset
  const [resetEmail, setResetEmail] = useState('')
  const [resetPwd, setResetPwd] = useState('')
  const [loadingReset, setLoadingReset] = useState(false)
  const [resetMsg, setResetMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  const done = tasks.filter(t => t.log?.completed).length

  function handlePhotoSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file) return
    setTaskPhotoFile(file)
    const r = new FileReader(); r.onload = ev => setTaskPhoto(ev.target?.result as string); r.readAsDataURL(file)
  }

  async function addTask() {
    if (!taskName.trim()) return
    setLoadingTask(true)
    let photoUrl: string | null = null
    if (taskPhotoFile) {
      const path = `task-icons/${profile.household_id}/${Date.now()}.jpg`
      const { error } = await supabase.storage.from('task-photos').upload(path, taskPhotoFile, { upsert: true })
      if (!error) { const { data } = supabase.storage.from('task-photos').getPublicUrl(path); photoUrl = data.publicUrl }
    }
    const res = await fetch('/api/tasks/adhoc', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: taskName, icon: 'ti-star', scheduled_time: taskTime, photo_url: photoUrl, is_recurring: taskType === 'recurring' }),
    })
    const { task } = await res.json()
    setTasks(p => [...p, { ...task, log: null }])
    setTaskName(''); setTaskTime('9:00 AM'); setTaskType('recurring'); setTaskPhoto(null); setTaskPhotoFile(null)
    setLoadingTask(false)
  }

  async function deleteTask(id: string) {
    await fetch('/api/tasks/adhoc', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    setTasks(p => p.filter(t => t.id !== id))
  }

  async function saveTime(id: string, time: string) {
    await fetch('/api/tasks/adhoc', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, scheduled_time: time }) })
    setTasks(p => p.map(t => t.id === id ? { ...t, scheduled_time: time } : t))
    setEditingTimeId(null)
  }

  async function createMember() {
    if (!memberName || !memberEmail || !memberPassword) { setMemberMsg({ type: 'err', text: 'All fields required' }); return }
    setLoadingMember(true); setMemberMsg(null)
    const res = await fetch('/api/admin/create-member', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ full_name: memberName, email: memberEmail, password: memberPassword, role: memberRole }) })
    const data = await res.json()
    if (data.error) setMemberMsg({ type: 'err', text: data.error })
    else { setMemberMsg({ type: 'ok', text: `✅ Account created! They can log in with ${memberEmail}` }); setMemberName(''); setMemberEmail(''); setMemberPassword('') }
    setLoadingMember(false)
  }

  async function resetPassword() {
    if (!resetEmail || !resetPwd || resetPwd.length < 6) { setResetMsg({ type: 'err', text: 'Enter email and password (min 6 chars)' }); return }
    setLoadingReset(true); setResetMsg(null)
    const res = await fetch('/api/admin/reset-password', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ member_email: resetEmail, new_password: resetPwd }) })
    const data = await res.json()
    if (data.error) setResetMsg({ type: 'err', text: data.error })
    else { setResetMsg({ type: 'ok', text: '✅ Password updated!' }); setResetEmail(''); setResetPwd('') }
    setLoadingReset(false)
  }

  const S = {
    page: { padding: '28px 20px', minHeight: '100vh' },
    h1: { fontSize: 22, fontWeight: 700, color: '#111827', margin: '0 0 4px' },
    sub: { fontSize: 13, color: '#9ca3af', marginBottom: 20 },
    tabs: { display: 'flex', gap: 8, marginBottom: 24 },
    tab: (active: boolean) => ({ flex: 1, padding: '9px 4px', borderRadius: 12, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600, background: active ? '#1D9E75' : '#f3f4f6', color: active ? '#fff' : '#6b7280', WebkitTapHighlightColor: 'transparent' }),
    card: { background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', padding: 16, marginBottom: 16 },
    label: { display: 'block', fontSize: 13, fontWeight: 500, color: '#6b7280', marginBottom: 6 },
    input: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 15, outline: 'none', background: '#fff', fontFamily: 'inherit', marginBottom: 10 },
    select: { width: '100%', border: '1.5px solid #e5e7eb', borderRadius: 12, padding: '11px 14px', fontSize: 15, outline: 'none', background: '#fff', fontFamily: 'inherit', marginBottom: 10 },
    row: { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: '1px solid #f9fafb' },
    toggle: (active: boolean) => ({ flex: 1, padding: '10px 8px', borderRadius: 12, border: `1.5px solid ${active ? '#1D9E75' : '#e5e7eb'}`, background: active ? '#1D9E75' : '#f9fafb', color: active ? '#fff' : '#6b7280', fontWeight: 600, fontSize: 13, cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }),
  }

  return (
    <div style={S.page}>
      <h1 style={S.h1}>Admin</h1>
      <p style={S.sub}>{household.name}</p>

      <div style={S.tabs}>
        {(['overview', 'tasks', 'members'] as const).map(t => (
          <button key={t} style={S.tab(tab === t)} onClick={() => setTab(t)}>
            {t === 'overview' ? '📊 Overview' : t === 'tasks' ? '📋 Tasks' : '👥 Members'}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {tab === 'overview' && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <div style={{ background: '#f0fdf4', borderRadius: 16, padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#1D9E75', margin: 0 }}>{done}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>done today</p>
            </div>
            <div style={{ background: '#fff7ed', borderRadius: 16, padding: 16, textAlign: 'center' }}>
              <p style={{ fontSize: 32, fontWeight: 700, color: '#c2410c', margin: 0 }}>{tasks.length - done}</p>
              <p style={{ fontSize: 12, color: '#6b7280', margin: '4px 0 0' }}>pending</p>
            </div>
          </div>
          <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #f0f0f0', overflow: 'hidden' }}>
            {tasks.map((t, i) => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderBottom: i < tasks.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: COLOURS[i % COLOURS.length], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                  {t.photo_url ? <img src={t.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={t.name} /> : <i className={`ti ${t.icon}`} style={{ color: '#fff', fontSize: 16 }} />}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>{t.name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 11, color: '#9ca3af' }}>{t.scheduled_time || 'No time'} · {t.is_recurring ? 'daily' : 'one-time'}</p>
                </div>
                <i className={`ti ${t.log?.completed ? 'ti-circle-check' : 'ti-circle-x'}`} style={{ fontSize: 22, color: t.log?.completed ? '#1D9E75' : '#f87171' }} />
              </div>
            ))}
          </div>
        </>
      )}

      {/* TASKS */}
      {tab === 'tasks' && (
        <>
          {/* Edit times for existing tasks */}
          <div style={S.card}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>⏰ Edit task times</p>
            {tasks.map(t => (
              <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid #f9fafb' }}>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 13, fontWeight: 500, color: '#374151' }}>{t.name}</p>
                  {editingTimeId === t.id ? (
                    <select style={{ marginTop: 4, fontSize: 12, border: '1px solid #d1d5db', borderRadius: 8, padding: '4px 8px', background: '#fff' }}
                      defaultValue={t.scheduled_time || '9:00 AM'}
                      onChange={e => saveTime(t.id, e.target.value)} autoFocus>
                      {TIMES.map(tm => <option key={tm} value={tm}>{tm}</option>)}
                    </select>
                  ) : (
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#9ca3af' }}>🕐 {t.scheduled_time || 'No time set'}</p>
                  )}
                </div>
                <button onClick={() => setEditingTimeId(editingTimeId === t.id ? null : t.id)}
                  style={{ background: '#f3f4f6', border: 'none', borderRadius: 8, padding: '5px 10px', fontSize: 12, color: '#374151', cursor: 'pointer' }}>
                  {editingTimeId === t.id ? 'Cancel' : 'Edit'}
                </button>
                {t.is_adhoc && (
                  <button onClick={() => deleteTask(t.id)} style={{ background: 'none', border: 'none', color: '#d1d5db', cursor: 'pointer', fontSize: 18 }}>
                    <i className="ti ti-trash" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Add new task */}
          <div style={S.card}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 14px' }}>➕ Add task</p>
            <label style={S.label}>Task name</label>
            <input style={S.input} placeholder="e.g. Walk the dog" value={taskName} onChange={e => setTaskName(e.target.value)} />

            <label style={S.label}>Time</label>
            <select style={S.select} value={taskTime} onChange={e => setTaskTime(e.target.value)}>
              {TIMES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>

            <label style={S.label}>Task type</label>
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button style={S.toggle(taskType === 'recurring')} onClick={() => setTaskType('recurring')}>🔁 Daily</button>
              <button style={S.toggle(taskType === 'one-time')} onClick={() => setTaskType('one-time')}>1️⃣ One time</button>
            </div>

            <label style={S.label}>Photo (helps maid recognise task)</label>
            <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhotoSelect} />
            {taskPhoto ? (
              <div style={{ position: 'relative', marginBottom: 14 }}>
                <img src={taskPhoto} style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 12, border: '2px solid #1D9E75' }} alt="preview" />
                <button onClick={() => { setTaskPhoto(null); setTaskPhotoFile(null) }}
                  style={{ position: 'absolute', top: 8, right: 8, width: 28, height: 28, borderRadius: '50%', background: '#fff', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px rgba(0,0,0,0.15)' }}>
                  <i className="ti ti-x" style={{ fontSize: 14 }} />
                </button>
              </div>
            ) : (
              <button onClick={() => photoRef.current?.click()}
                style={{ width: '100%', height: 100, border: '2px dashed #d1d5db', borderRadius: 12, background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, cursor: 'pointer', marginBottom: 14, color: '#9ca3af' }}>
                <span style={{ fontSize: 32 }}>📸</span>
                <span style={{ fontSize: 13 }}>Take a photo</span>
              </button>
            )}

            <button onClick={addTask} disabled={loadingTask || !taskName.trim()} className="hk-btn-primary">
              {loadingTask ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-plus" />} Add task
            </button>
          </div>
        </>
      )}

      {/* MEMBERS */}
      {tab === 'members' && (
        <>
          {/* Current members */}
          <div style={S.card}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 12px' }}>👥 Household members</p>
            {members.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < members.length - 1 ? '1px solid #f9fafb' : 'none' }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 16, color: '#374151', flexShrink: 0 }}>
                  {m.full_name.charAt(0).toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: 14, fontWeight: 500, color: '#111827' }}>{m.full_name}</p>
                  <p style={{ margin: '2px 0 0', fontSize: 12, color: '#9ca3af' }}>{m.email}</p>
                </div>
                <span style={{ fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: ROLE_STYLE[m.role].bg, color: ROLE_STYLE[m.role].color }}>
                  {m.role}
                </span>
              </div>
            ))}
          </div>

          {/* Create member */}
          <div style={S.card}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 14px' }}>➕ Add member</p>
            <label style={S.label}>Full name</label>
            <input style={S.input} placeholder="e.g. Lakshmi" value={memberName} onChange={e => setMemberName(e.target.value)} />
            <label style={S.label}>Email (they use this to log in)</label>
            <input style={S.input} type="email" placeholder="e.g. lakshmi@gmail.com" value={memberEmail} onChange={e => setMemberEmail(e.target.value)} />
            <label style={S.label}>Password</label>
            <input style={S.input} type="password" placeholder="Min 6 characters" value={memberPassword} onChange={e => setMemberPassword(e.target.value)} />
            <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
              <button style={S.toggle(memberRole === 'collaborator')} onClick={() => setMemberRole('collaborator')}>👫 Family</button>
              <button style={S.toggle(memberRole === 'staff')} onClick={() => setMemberRole('staff')}>🧹 Staff/Maid</button>
            </div>
            {memberMsg && <div className={memberMsg.type === 'ok' ? 'hk-success' : 'hk-error'} style={{ marginBottom: 10 }}>{memberMsg.text}</div>}
            <button onClick={createMember} disabled={loadingMember} className="hk-btn-primary">
              {loadingMember ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-user-plus" />} Create account
            </button>
          </div>

          {/* Reset password */}
          <div style={S.card}>
            <p style={{ fontSize: 14, fontWeight: 600, color: '#374151', margin: '0 0 14px' }}>🔑 Reset member password</p>
            <label style={S.label}>Member email</label>
            <input style={S.input} type="email" placeholder="their@email.com" value={resetEmail} onChange={e => setResetEmail(e.target.value)} />
            <label style={S.label}>New password</label>
            <input style={S.input} type="password" placeholder="Min 6 characters" value={resetPwd} onChange={e => setResetPwd(e.target.value)} />
            {resetMsg && <div className={resetMsg.type === 'ok' ? 'hk-success' : 'hk-error'} style={{ marginBottom: 10 }}>{resetMsg.text}</div>}
            <button onClick={resetPassword} disabled={loadingReset} className="hk-btn-secondary">
              {loadingReset ? <i className="ti ti-loader-2 spin" /> : <i className="ti ti-key" />} Reset password
            </button>
          </div>
        </>
      )}
    </div>
  )
}
