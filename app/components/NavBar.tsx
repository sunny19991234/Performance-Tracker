'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'

const tabs = [
  {
    href: '/',
    label: 'Dashboard',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
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
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
      </svg>
    ),
  },
  {
    href: '/leerdoelen',
    label: 'Leerdoelen',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
      </svg>
    ),
  },
  {
    href: '/portfolio',
    label: 'Portfolio',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
        strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
        <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/>
      </svg>
    ),
  },
]

const LogoutIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" width="15" height="15">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
    <polyline points="16 17 21 12 16 7"/>
    <line x1="21" y1="12" x2="9" y2="12"/>
  </svg>
)

export default function NavBar() {
  const pathname = usePathname()
  const router = useRouter()

  if (pathname === '/login') return null

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/login')
    router.refresh()
  }

  return (
    <>
      <style>{`
        .nav-root {
          background: #0d1117;
          border-bottom: 1px solid #21262d;
          position: sticky;
          top: 0;
          z-index: 10;
        }
        .nav-inner {
          max-width: 720px;
          margin: 0 auto;
          padding: 10px 16px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }
        .nav-logo {
          display: flex;
          align-items: center;
          gap: 9px;
          flex-shrink: 0;
          text-decoration: none;
        }
        .nav-logo-icon {
          width: 28px;
          height: 28px;
          border-radius: 7px;
          background: #1a3a4a;
          border: 1px solid rgba(79,195,247,0.3);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }
        .nav-logo-text {
          font-size: 14px;
          font-weight: 600;
          color: #e6edf3;
          letter-spacing: -0.2px;
          font-family: 'IBM Plex Sans', 'DM Sans', sans-serif;
          white-space: nowrap;
        }
        .nav-tabs-wrap {
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .nav-tabs {
          display: flex;
          gap: 2px;
          background: #161b22;
          border: 1px solid #30363d;
          border-radius: 10px;
          padding: 3px;
        }
        .nav-tab {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 7px 13px;
          border-radius: 7px;
          font-size: 13px;
          font-weight: 500;
          color: #7d8590;
          background: transparent;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
          font-family: 'IBM Plex Sans', 'DM Sans', sans-serif;
        }
        .nav-tab.active {
          font-weight: 600;
          color: #0d1117;
          background: #4fc3f7;
        }
        .nav-logout {
          background: transparent;
          border: 1px solid #21262d;
          border-radius: 8px;
          padding: 7px 8px;
          color: #444c56;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.15s;
          flex-shrink: 0;
        }
        .nav-logout:hover {
          border-color: #f85149;
          color: #f85149;
        }

        /* Bottom nav: hidden by default */
        .nav-bottom {
          display: none;
        }

        @media (max-width: 600px) {
          /* Topbar: only logo icon + logout */
          .nav-logo-text { display: none; }
          .nav-tabs-wrap { display: none; }

          /* Mobile logout button in topbar */
          .nav-logout-mobile {
            display: flex !important;
          }

          /* Bottom tab bar */
          .nav-bottom {
            display: flex;
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            z-index: 20;
            background: #0d1117;
            border-top: 1px solid #21262d;
            padding-bottom: env(safe-area-inset-bottom, 0px);
          }
          .nav-bottom-tab {
            flex: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 3px;
            padding: 10px 2px 8px;
            text-decoration: none;
            color: #444c56;
            font-family: 'IBM Plex Sans', 'DM Sans', sans-serif;
            font-size: 10px;
            font-weight: 500;
            transition: color 0.15s;
            position: relative;
            -webkit-tap-highlight-color: transparent;
          }
          .nav-bottom-tab.active {
            color: #4fc3f7;
          }
          .nav-bottom-tab::before {
            content: '';
            position: absolute;
            top: 0;
            left: 25%;
            right: 25%;
            height: 2px;
            background: transparent;
            border-radius: 0 0 2px 2px;
            transition: background 0.15s;
          }
          .nav-bottom-tab.active::before {
            background: #4fc3f7;
          }
        }

        /* Ensure desktop logout mobile variant stays hidden on large screens */
        .nav-logout-mobile {
          display: none;
        }
      `}</style>

      {/* ── Top bar ─────────────────────────────────── */}
      <nav className="nav-root">
        <div className="nav-inner">
          <Link href="/" className="nav-logo">
            <div className="nav-logo-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="1.8"
                strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
              </svg>
            </div>
            <span className="nav-logo-text">Skills Dashboard</span>
          </Link>

          {/* Desktop: tabs + logout */}
          <div className="nav-tabs-wrap">
            <div className="nav-tabs">
              {tabs.map((tab) => {
                const active = pathname === tab.href
                return (
                  <Link key={tab.href} href={tab.href} className={`nav-tab${active ? ' active' : ''}`}>
                    {tab.icon}
                    {tab.label}
                  </Link>
                )
              })}
            </div>
            <button className="nav-logout" onClick={handleLogout} title="Uitloggen">
              <LogoutIcon />
            </button>
          </div>

          {/* Mobile: logout in top bar */}
          <button className="nav-logout nav-logout-mobile" onClick={handleLogout} title="Uitloggen">
            <LogoutIcon />
          </button>
        </div>
      </nav>

      {/* ── Mobile bottom nav ──────────────────────── */}
      <nav className="nav-bottom" aria-label="Navigatie">
        {tabs.map((tab) => {
          const active = pathname === tab.href
          return (
            <Link key={tab.href} href={tab.href} className={`nav-bottom-tab${active ? ' active' : ''}`}>
              {tab.icon}
              <span>{tab.label}</span>
            </Link>
          )
        })}
      </nav>
    </>
  )
}