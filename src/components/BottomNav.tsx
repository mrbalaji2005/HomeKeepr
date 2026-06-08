'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Role } from '@/lib/types'

const S = {
  nav: {
    position: 'fixed' as const, bottom: 0, left: 0, right: 0, zIndex: 100,
    background: '#fff', borderTop: '1px solid #f0f0f0',
    display: 'flex', maxWidth: 480, margin: '0 auto',
    paddingBottom: 'env(safe-area-inset-bottom, 0px)',
  },
  link: (active: boolean) => ({
    flex: 1, display: 'flex', flexDirection: 'column' as const,
    alignItems: 'center', justifyContent: 'center',
    paddingTop: 10, paddingBottom: 10, gap: 3,
    color: active ? '#1D9E75' : '#9ca3af',
    textDecoration: 'none', minHeight: 60,
    WebkitTapHighlightColor: 'transparent',
    cursor: 'pointer',
  }),
  icon: { fontSize: 26, lineHeight: 1 },
  label: { fontSize: 11, fontWeight: 500, lineHeight: 1 },
}

export default function BottomNav({ role }: { role: Role }) {
  const pathname = usePathname()
  const items = [
    { href: '/dashboard', icon: 'ti-clipboard-list', label: 'Tasks', roles: ['admin', 'collaborator', 'staff'] },
    { href: '/dashboard/salary', icon: 'ti-coin-rupee', label: 'Salary', roles: ['admin', 'collaborator', 'staff'] },
    { href: '/dashboard/admin', icon: 'ti-settings', label: 'Admin', roles: ['admin', 'collaborator'] },
  ].filter(i => i.roles.includes(role))

  return (
    <nav style={S.nav}>
      {items.map(item => {
        const active = pathname === item.href
        return (
          <Link key={item.href} href={item.href} style={S.link(active)}>
            <i className={`ti ${item.icon}`} style={S.icon} />
            <span style={S.label}>{item.label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
