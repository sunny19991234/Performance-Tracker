import type { Metadata } from 'next'
import './globals.css'
import NavBar from './components/NavBar'

export const metadata: Metadata = {
  title: 'Skills Dashboard',
  description: 'Persoonlijk skills en performance dashboard',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="nl" style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh' }}>
      <body style={{ background: '#0d1117', color: '#e6edf3', minHeight: '100vh' }}>
        <NavBar />
        <main style={{ maxWidth: '720px', margin: '0 auto', padding: '24px 16px' }}>
          {children}
        </main>
      </body>
    </html>
  )
}