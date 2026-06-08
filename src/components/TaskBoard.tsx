'use client'
import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { TaskWithLog, Profile } from '@/lib/types'

const COLOURS = [
  { bg: '#f97316', light: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  { bg: '#3b82f6', light: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  { bg: '#a855f7', light: '#faf5ff', text: '#7e22ce', border: '#e9d5ff' },
  { bg: '#ec4899', light: '#fdf2f8', text: '#be185d', border: '#fbcfe8' },
  { bg: '#14b8a6', light: '#f0fdfa', text: '#0f766e', border: '#99f6e4' },
  { bg: '#eab308', light: '#fefce8', text: '#a16207', border: '#fef08a' },
  { bg: '#ef4444', light: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  { bg: '#6366f1', light: '#eef2ff', text: '#4338ca', border: '#c7d2fe' },
]

function getColour(id: string) {
  let h = 0; for (const c of id) h = (h << 5) - h + c.charCodeAt(0)
  return COLOURS[Math.abs(h) % COLOURS.length]
}

interface Props { tasks: TaskWithLog[]; profile: Profile & { households?: any }; householdName: string; today: string }

export default function TaskBoard({ tasks: init, profile, householdName, today }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const isStaff = profile.role === 'staff'
  const [tasks, setTasks] = useState(init)
  const [active, setActive] = useState<TaskWithLog | null>(null)
  const [loading, setLoading] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const done = tasks.filter(t => t.log?.completed).length
  const total = tasks.length
  const pct = total ? Math.round(done / total * 100) : 0
  const dateStr = new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })

  async function complete(task: TaskWithLog, photoUrl?: string) {
    setLoading(task.id)
    await fetch('/api/tasks/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_template_id: task.id, completed: true, photo_url: photoUrl }),
    })
    if (isStaff) {
      setTasks(p => p.filter(t => t.id !== task.id))
    } else {
      setTasks(p => p.map(t => t.id === task.id ? { ...t, log: { ...t.log, completed: true, photo_url: photoUrl || null } as any } : t))
    }
    setActive(null); setLoading(null)
  }

  async function uncomplete(task: TaskWithLog) {
    setLoading(task.id)
    await fetch('/api/tasks/complete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ task_template_id: task.id, completed: false }),
    })
    setTasks(p => p.map(t => t.id === task.id ? { ...t, log: { ...t.log, completed: false, photo_url: null } as any } : t))
    setActive(null); setLoading(null)
  }

  async function handlePhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if (!file || !active) return
    setLoading(active.id)
    const path = `${profile.household_id}/${today}/${active.id}-${Date.now()}.jpg`
    const { error } = await supabase.storage.from('task-photos').upload(path, file, { upsert: true })
    if (error) { setLoading(null); return }
    const { data } = supabase.storage.from('task-photos').getPublicUrl(path)
    await complete(active, data.publicUrl)
    e.target.value = ''
  }

  const activeColour = active ? getColour(active.id) : COLOURS[0]

  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb' }}>
      {/* Header */}
      <div style={{ background: '#fff', padding: '28px 20px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 }}>{householdName}</h1>
            <p style={{ fontSize: 13, color: '#9ca3af', marginTop: 3 }}>{dateStr}</p>
          </div>
          <button onClick={async () => { await supabase.auth.signOut(); router.push('/login') }}
            style={{ width: 40, height: 40, borderRadius: '50%', border: 'none', background: '#f3f4f6', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6b7280' }}>
            <i className="ti ti-logout" style={{ fontSize: 18 }} />
          </button>
        </div>

        {isStaff ? (
          <div style={{ borderRadius: 14, padding: '12px 16px', background: tasks.length === 0 ? '#f0fdf4' : '#fff7ed', textAlign: 'center' }}>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16, color: tasks.length === 0 ? '#15803d' : '#c2410c' }}>
              {tasks.length === 0 ? '🎉 All done! Great work today!' : `⏳ ${tasks.length} task${tasks.length > 1 ? 's' : ''} to complete`}
            </p>
          </div>
        ) : (
          <>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ flex: 1, height: 10, borderRadius: 99, background: '#e5e7eb', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${pct}%`, background: '#1D9E75', borderRadius: 99, transition: 'width 0.5s ease' }} />
              </div>
              <span style={{ fontSize: 14, fontWeight: 700, color: '#374151', whiteSpace: 'nowrap' }}>{done}/{total} ✅</span>
            </div>
            {done === total && total > 0 && (
              <div style={{ marginTop: 10, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px', textAlign: 'center' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#15803d' }}>🎉 All tasks done today!</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Task grid */}
      {tasks.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', paddingTop: 80, color: '#9ca3af' }}>
          <span style={{ fontSize: 64, marginBottom: 16 }}>✅</span>
          <p style={{ fontSize: 18, fontWeight: 600, color: '#6b7280', margin: 0 }}>All tasks complete!</p>
          <p style={{ fontSize: 14, marginTop: 8 }}>New tasks will appear tomorrow</p>
        </div>
      ) : (
        <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {tasks.map(task => {
            const c = getColour(task.id)
            const isDone = task.log?.completed

            return (
              <div key={task.id} onClick={() => setActive(task)}
                style={{
                  borderRadius: 24, border: `2px solid ${isDone && !isStaff ? '#86efac' : c.border}`,
                  background: isDone && !isStaff ? '#22c55e' : c.light,
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', padding: 14, height: 170,
                  cursor: 'pointer', position: 'relative', userSelect: 'none',
                  WebkitTapHighlightColor: 'transparent',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  transition: 'transform 0.1s',
                }}>
                {/* Icon / photo */}
                <div style={{
                  width: 64, height: 64, borderRadius: 18,
                  background: isDone && !isStaff ? 'rgba(255,255,255,0.3)' : c.bg,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  marginBottom: 10, overflow: 'hidden', flexShrink: 0,
                  boxShadow: '0 3px 8px rgba(0,0,0,0.15)',
                }}>
                  {task.photo_url ? (
                    <img src={task.photo_url} alt={task.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : isDone && !isStaff ? (
                    <i className="ti ti-circle-check" style={{ fontSize: 36, color: '#fff' }} />
                  ) : (
                    <i className={`ti ${task.icon}`} style={{ fontSize: 30, color: '#fff' }} />
                  )}
                </div>

                {/* Name */}
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textAlign: 'center', lineHeight: 1.3, color: isDone && !isStaff ? '#fff' : c.text }}>
                  {task.name}
                </p>

                {/* Time */}
                {task.scheduled_time && !isDone && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 8, background: '#fff', borderRadius: 99, padding: '3px 10px' }}>
                    <i className="ti ti-clock" style={{ fontSize: 11, color: '#9ca3af' }} />
                    <span style={{ fontSize: 11, color: '#6b7280', fontWeight: 600 }}>{task.scheduled_time}</span>
                  </div>
                )}

                {/* Done label */}
                {isDone && !isStaff && (
                  <p style={{ margin: '6px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>Done ✓</p>
                )}

                {/* Proof photo */}
                {isDone && !isStaff && task.log?.photo_url && (
                  <img src={task.log.photo_url} alt="proof" style={{ position: 'absolute', bottom: 10, right: 10, width: 32, height: 32, borderRadius: 8, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.6)' }} />
                )}

                {/* Loading */}
                {loading === task.id && (
                  <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.75)', borderRadius: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="ti ti-loader-2 spin" style={{ fontSize: 28, color: '#1D9E75' }} />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <input ref={fileRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handlePhoto} />

      {/* Bottom sheet */}
      {active && (
        <div onClick={() => setActive(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 200, display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }}>
          <div onClick={e => e.stopPropagation()} style={{ background: '#fff', borderRadius: '24px 24px 0 0', width: '100%', maxWidth: 480, padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* Task info */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, paddingBottom: 16, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 60, height: 60, borderRadius: 16, background: activeColour.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', flexShrink: 0 }}>
                {active.photo_url ? <img src={active.photo_url} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={active.name} />
                  : <i className={`ti ${active.icon}`} style={{ fontSize: 28, color: '#fff' }} />}
              </div>
              <div>
                <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{active.name}</h2>
                {active.scheduled_time && <p style={{ margin: '4px 0 0', fontSize: 13, color: '#9ca3af' }}>🕐 {active.scheduled_time}</p>}
                <span style={{ display: 'inline-block', marginTop: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 99, background: active.log?.completed ? '#dcfce7' : '#fff7ed', color: active.log?.completed ? '#15803d' : '#c2410c' }}>
                  {active.log?.completed ? '✅ Completed' : '⏳ Pending'}
                </span>
              </div>
            </div>

            {/* Proof photo if done */}
            {active.log?.completed && active.log?.photo_url && (
              <img src={active.log.photo_url} alt="proof" style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 16 }} />
            )}

            {active.log?.completed && !isStaff ? (
              <>
                <button onClick={() => uncomplete(active)} className="hk-btn-danger">
                  <i className="ti ti-rotate-left" /> Mark as not done
                </button>
                <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 15, padding: 10, cursor: 'pointer' }}>Close</button>
              </>
            ) : (
              <>
                <button onClick={() => complete(active)} style={{ width: '100%', background: '#1D9E75', color: '#fff', border: 'none', borderRadius: 16, padding: 20, fontSize: 20, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, WebkitTapHighlightColor: 'transparent' }}>
                  <span style={{ fontSize: 32 }}>✅</span> Done!
                </button>
                <button onClick={() => fileRef.current?.click()} style={{ width: '100%', background: '#eff6ff', color: '#1d4ed8', border: 'none', borderRadius: 16, padding: 16, fontSize: 17, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, WebkitTapHighlightColor: 'transparent' }}>
                  <span style={{ fontSize: 24 }}>📸</span> Take photo & done
                </button>
                <button onClick={() => setActive(null)} style={{ background: 'none', border: 'none', color: '#9ca3af', fontSize: 15, padding: 10, cursor: 'pointer' }}>Not yet</button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
