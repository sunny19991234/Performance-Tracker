'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href: '/skills',
    label: 'Skills',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: '/leerdoelen',
    label: 'Leerdoelen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
]

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  // Don't render navbar on login page or portfolio (portfolio has its own clean layout)
  if (pathname === '/login') return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <nav style={{
      background: '#0d1117',
      borderBottom: '1px solid #21262d',
      position: 'sticky',
      top: 0,
      zIndex: 10,
    }}>
      <div style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
      }}>

        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
          <div style={{
            width: '30px', height: '30px', borderRadius: '8px',
            background: '#1a3a4a', border: '1px solid rgba(79,195,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
          <span style={{
            fontSize: '15px', fontWeight: 600, color: '#e6edf3',
            letterSpacing: '-0.2px',
            fontFamily: "'IBM Plex Sans', 'DM Sans', sans-serif",
          }}>
            Skills Dashboard
          </span>
        </div>

        {/* Tabs + logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{
            display: 'flex', gap: '3px',
            background: '#161b22', border: '1px solid #30363d',
            borderRadius: '10px', padding: '4px',
          }}>
            {tabs.map((tab) => {
              const active = pathname === tab.href
              return (
                <Link key={tab.href} href={tab.href} style={{
                  display: 'flex', alignItems: 'center', gap: '6px',
                  padding: '7px 14px', borderRadius: '7px',
                  fontSize: '13px',
                  fontWeight: active ? 600 : 500,
                  color: active ? '#0d1117' : '#7d8590',
                  background: active ? '#4fc3f7' : 'transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap',
                  fontFamily: "'IBM Plex Sans', 'DM Sans', sans-serif",
                }}>
                  {tab.icon}
                  {tab.label}
                </Link>
              )
            })}
          </div>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Uitloggen"
            style={{
              background: 'transparent',
              border: '1px solid #21262d',
              borderRadius: '8px',
              padding: '7px 8px',
              color: '#444c56',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'all 0.15s',
              flexShrink: 0,
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = '#f85149'
              e.currentTarget.style.color = '#f85149'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = '#21262d'
              e.currentTarget.style.color = '#444c56'
            }}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
          </button>
        </div>
      </div>
    </nav>
  )
}