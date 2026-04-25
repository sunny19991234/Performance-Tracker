'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [from] = useState(() => {
    if (typeof window === 'undefined') return '/'

    return new URLSearchParams(window.location.search).get('from') || '/'
  })
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    })

    if (res.ok) {
      router.push(from)
      router.refresh()
    } else {
      setError('Onjuist wachtwoord.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d1117',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px',
      fontFamily: "'IBM Plex Sans', 'DM Sans', sans-serif",
    }}>
      <div style={{
        width: '100%',
        maxWidth: '360px',
        animation: 'fadeIn 0.3s ease',
      }}>
        {/* Logo mark */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '32px' }}>
          <div style={{
            width: '44px', height: '44px',
            borderRadius: '12px',
            background: '#1a3a4a',
            border: '1px solid rgba(79,195,247,0.3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <svg viewBox="0 0 24 24" fill="none" stroke="#4fc3f7" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" width="20" height="20">
              <rect x="3" y="3" width="7" height="7"/>
              <rect x="14" y="3" width="7" height="7"/>
              <rect x="3" y="14" width="7" height="7"/>
              <rect x="14" y="14" width="7" height="7"/>
            </svg>
          </div>
        </div>

        <h1 style={{
          fontFamily: "'Crimson Pro', serif",
          fontSize: '26px', fontWeight: 600,
          color: '#e6edf3', textAlign: 'center',
          marginBottom: '6px',
        }}>
          Skills Dashboard
        </h1>
        <p style={{
          fontSize: '13px', color: '#7d8590',
          textAlign: 'center', marginBottom: '32px',
        }}>
          Voer je wachtwoord in om door te gaan.
        </p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <input
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Wachtwoord"
            autoFocus
            required
            style={{
              background: '#161b22',
              border: `1px solid ${error ? '#f85149' : '#30363d'}`,
              borderRadius: '8px',
              padding: '12px 14px',
              color: '#e6edf3',
              fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '14px',
              outline: 'none',
              width: '100%',
              transition: 'border-color 0.15s',
            }}
            onFocus={e => { if (!error) e.target.style.borderColor = '#4fc3f7' }}
            onBlur={e => { if (!error) e.target.style.borderColor = '#30363d' }}
          />

          {error && (
            <p style={{
              fontSize: '12px', color: '#f85149',
              margin: '0', textAlign: 'center',
            }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            style={{
              background: loading || !password ? '#1a3a4a' : '#4fc3f7',
              color: loading || !password ? '#7d8590' : '#0d1117',
              border: 'none', borderRadius: '8px',
              padding: '12px', fontFamily: "'IBM Plex Sans', sans-serif",
              fontSize: '14px', fontWeight: 600,
              cursor: loading || !password ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s',
              width: '100%',
            }}
          >
            {loading ? 'Inloggen...' : 'Inloggen'}
          </button>
        </form>

        <p style={{
          fontSize: '11px', color: '#444c56',
          textAlign: 'center', marginTop: '24px',
        }}>
          Alleen voor persoonlijk gebruik
        </p>
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:wght@600&family=IBM+Plex+Sans:wght@400;600&display=swap');
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: #444c56; }
      `}</style>
    </div>
  )
}
