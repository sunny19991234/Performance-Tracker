'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { supabase } from '../lib/supabase'

// ─── Types ───────────────────────────────────────────────────────────────────

type Skill = {
  id: string
  naam: string
  categorie: string
  niveau: number
  subcategorie: string | null
}

type Subtaak = {
  id: string
  leerdoel_id: string
  titel: string
  voltooid: boolean
  deadline: string | null
  volgorde: number
  voltooid_op: string | null
}

type Leerdoel = {
  id: string
  titel: string
  type: string
  status: string
  prioriteit: string
  doeldatum: string
  voortgang: number
  voortgang_override: boolean
  skill_id: string | null
  thema: string | null
  fase: string
  updated_at: string
  tags: { id: string; naam: string }[]
}

// ─── Constants ────────────────────────────────────────────────────────────────

const PRIO_ORDER: Record<string, number> = { High: 0, Medium: 1, Low: 2 }
const PRIO_COLORS: Record<string, string> = { High: '#f85149', Medium: '#d29922', Low: '#3fb950' }
const STATUS_COLORS: Record<string, string> = {
  'Niet gestart': '#7d8590', Bezig: '#58a6ff', Afgerond: '#3fb950', Gestopt: '#f85149',
}

function formatDeadline(date: string) {
  return new Date(date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function weekKey(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - d.getDay() + 1)
  return d.toISOString().slice(0, 10)
}

// ─── Small components ─────────────────────────────────────────────────────────

function NiveauDots({ niveau, color }: { niveau: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '3px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: '6px', height: '6px', borderRadius: '50%',
          background: i <= niveau ? color : '#1c2330',
          border: `1px solid ${i <= niveau ? color : '#2d333b'}`,
        }} />
      ))}
    </div>
  )
}

function ProgressBar({ pct, color, height = 3 }: { pct: number; color: string; height?: number }) {
  return (
    <div style={{ height, background: '#1c2330', borderRadius: 2, overflow: 'hidden', flex: 1 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 2, transition: 'width 0.4s ease' }} />
    </div>
  )
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '9px', fontWeight: 600, letterSpacing: '0.5px',
      padding: '2px 6px', borderRadius: '4px', textTransform: 'uppercase' as const,
      background: `${color}18`, color,
    }}>{label}</span>
  )
}

// ─── Trend chart ──────────────────────────────────────────────────────────────

function TrendChart({ leerdoelen, subtaken }: {
  leerdoelen: Leerdoel[]
  subtaken: Subtaak[]
}) {
  // Build last 8 weeks
  const weeks: string[] = []
  for (let i = 7; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i * 7)
    weeks.push(weekKey(d))
  }

  // Count finished leerdoelen per week (by updated_at when status=Afgerond)
  const ldPerWeek: Record<string, number> = {}
  for (const ld of leerdoelen) {
    if (ld.status === 'Afgerond' && ld.updated_at) {
      const k = weekKey(new Date(ld.updated_at))
      if (weeks.includes(k)) ldPerWeek[k] = (ldPerWeek[k] || 0) + 1
    }
  }

  // Count finished subtaken per week (by voltooid_op)
  const subPerWeek: Record<string, number> = {}
  for (const sub of subtaken) {
    if (sub.voltooid && sub.voltooid_op) {
      const k = weekKey(new Date(sub.voltooid_op))
      if (weeks.includes(k)) subPerWeek[k] = (subPerWeek[k] || 0) + 1
    }
  }

  const maxSub = Math.max(1, ...weeks.map(w => subPerWeek[w] || 0))
  const maxLd = Math.max(1, ...weeks.map(w => ldPerWeek[w] || 0))
  const maxValue = Math.max(maxSub, maxLd)
  const yTicks = Array.from({ length: 5 }, (_, i) => Math.round((maxValue / 4) * (4 - i)))

  const BAR_W = 20
  const GAP = 8
  const H = 64
  const AXIS_W = 28
  const CHART_W = weeks.length * (BAR_W * 2 + GAP + 4)
  const totalW = AXIS_W + CHART_W

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg width={totalW} height={H + 20} style={{ display: 'block' }}>
        {yTicks.map(tick => {
          const y = H - Math.round((tick / maxValue) * H)
          return (
            <g key={tick}>
              <line x1={AXIS_W - 4} y1={y} x2={totalW} y2={y} stroke="#212833" strokeWidth="1" />
              <text
                x={AXIS_W - 8}
                y={y + 3}
                textAnchor="end"
                fill="#7d8590"
                fontSize="9"
                fontFamily="IBM Plex Mono"
              >
                {tick}
              </text>
            </g>
          )
        })}
        <line x1={AXIS_W - 4} y1={0} x2={AXIS_W - 4} y2={H} stroke="#30363d" strokeWidth="1" />
        {weeks.map((w, i) => {
          const x = AXIS_W + i * (BAR_W * 2 + GAP + 4)
          const ldH = Math.round(((ldPerWeek[w] || 0) / maxValue) * H)
          const subH = Math.round(((subPerWeek[w] || 0) / maxValue) * H)
          const label = new Date(w).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })
          return (
            <g key={w}>
              {/* subtaken bar */}
              <rect x={x} y={H - subH} width={BAR_W} height={subH || 2}
                fill="#58a6ff" opacity={0.7} rx={2} />
              {/* leerdoel bar */}
              <rect x={x + BAR_W + 2} y={H - ldH} width={BAR_W} height={ldH || 2}
                fill="#3fb950" opacity={0.7} rx={2} />
              <text x={x + BAR_W} y={H + 14} textAnchor="middle"
                fill="#444c56" fontSize="9" fontFamily="IBM Plex Mono">
                {label}
              </text>
            </g>
          )
        })}
      </svg>
      <div style={{ display: 'flex', gap: '14px', marginTop: '6px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#58a6ff', opacity: 0.8 }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Subtaken afgerond</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#3fb950', opacity: 0.8 }} />
          <span style={{ fontSize: '10px', color: 'var(--text-muted)', fontFamily: "'IBM Plex Mono', monospace" }}>Leerdoelen afgerond</span>
        </div>
      </div>
    </div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [nowLeerdoelen, setNowLeerdoelen] = useState<Leerdoel[]>([])
  const [allLeerdoelen, setAllLeerdoelen] = useState<Leerdoel[]>([])
  const [subtaken, setSubtaken] = useState<Record<string, Subtaak[]>>({})
  const [allSubtaken, setAllSubtaken] = useState<Subtaak[]>([])
  const [skills, setSkills] = useState<Skill[]>([])
  const [linkedSkills, setLinkedSkills] = useState<Skill[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(() => new Date())

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000)
    return () => clearInterval(t)
  }, [])

  const fetchData = useCallback(async () => {
    const [{ data: allLd }, { data: sk }, { data: allSubs }] = await Promise.all([
      supabase
        .from('leerdoelen')
        .select('*, leerdoel_tags(tag_id, tags(id, naam))')
        .order('doeldatum'),
      supabase.from('skills').select('*'),
      supabase
        .from('leerdoel_subtaken')
        .select('*')
        .order('volgorde'),
    ])

    const allLdMapped: Leerdoel[] = (allLd || []).map((l: Record<string, unknown>) => ({
      id: l.id as string,
      titel: l.titel as string,
      type: l.type as string,
      status: l.status as string,
      prioriteit: l.prioriteit as string,
      doeldatum: l.doeldatum as string,
      voortgang: l.voortgang as number,
      voortgang_override: l.voortgang_override as boolean,
      skill_id: l.skill_id as string | null,
      thema: l.thema as string | null,
      fase: l.fase as string,
      updated_at: l.updated_at as string,
      tags: ((l.leerdoel_tags as { tag_id: string; tags: { id: string; naam: string } }[]) || [])
        .filter(lt => lt.tags)
        .map(lt => lt.tags),
    }))

    const skillsData: Skill[] = sk || []

    // Now leerdoelen: active, sorted overdue > prioriteit > doeldatum
    const nowLd = allLdMapped
      .filter(l => l.fase === 'Now' && l.status !== 'Gestopt')
      .sort((a, b) => {
        const aOverdue = a.status !== 'Afgerond' && new Date(a.doeldatum) < now ? 0 : 1
        const bOverdue = b.status !== 'Afgerond' && new Date(b.doeldatum) < now ? 0 : 1
        if (aOverdue !== bOverdue) return aOverdue - bOverdue
        const pd = PRIO_ORDER[a.prioriteit] - PRIO_ORDER[b.prioriteit]
        if (pd !== 0) return pd
        return new Date(a.doeldatum).getTime() - new Date(b.doeldatum).getTime()
      })

    setAllLeerdoelen(allLdMapped)
    setNowLeerdoelen(nowLd)
    setSkills(skillsData)
    setAllSubtaken(allSubs || [])

    // Group subtaken by leerdoel
    const grouped: Record<string, Subtaak[]> = {}
    for (const sub of (allSubs || [])) {
      if (!grouped[sub.leerdoel_id]) grouped[sub.leerdoel_id] = []
      grouped[sub.leerdoel_id].push(sub)
    }
    setSubtaken(grouped)

    // Linked skills: skills tied to active Now leerdoelen
    const linkedIds = new Set(nowLd.map(l => l.skill_id).filter(Boolean))
    setLinkedSkills(skillsData.filter(s => linkedIds.has(s.id)))

    setLoading(false)
  }, [now])

  useEffect(() => {
    const loadData = async () => {
      await fetchData()
    }

    void loadData()
  }, [fetchData])

  async function toggleSubtaak(leerdoelId: string, subtaakId: string, voltooid: boolean) {
    await supabase.from('leerdoel_subtaken').update({ voltooid }).eq('id', subtaakId)
    const updated = (subtaken[leerdoelId] || []).map(s =>
      s.id === subtaakId ? { ...s, voltooid, voltooid_op: voltooid ? new Date().toISOString() : null } : s
    )
    setSubtaken(prev => ({ ...prev, [leerdoelId]: updated }))

    // Sync voortgang if not overridden
    const ld = nowLeerdoelen.find(l => l.id === leerdoelId)
    if (ld && !ld.voortgang_override && updated.length > 0) {
      const pct = Math.round((updated.filter(s => s.voltooid).length / updated.length) * 100)
      await supabase.from('leerdoelen').update({ voortgang: pct }).eq('id', leerdoelId)
      setNowLeerdoelen(prev => prev.map(l => l.id === leerdoelId ? { ...l, voortgang: pct } : l))
    }
  }

  // ── KPI calculations ─────────────────────────────────────────────────────

  const activeCount = nowLeerdoelen.filter(l => l.status === 'Bezig').length
  const totalNow = nowLeerdoelen.length
  const hardCount = skills.filter(s => s.categorie === 'hard').length
  const softCount = skills.filter(s => s.categorie === 'soft').length
  const avgVoortgang = totalNow > 0
    ? Math.round(nowLeerdoelen.reduce((s, l) => s + l.voortgang, 0) / totalNow)
    : 0

  // This month finished
  const thisMonth = allLeerdoelen.filter(l => {
    if (l.status !== 'Afgerond' || !l.updated_at) return false
    const d = new Date(l.updated_at)
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
  }).length

  // Future leerdoelen
  const nextLd = allLeerdoelen.filter(l => l.fase === 'Next' && l.status !== 'Gestopt')
  const laterLd = allLeerdoelen.filter(l => l.fase === 'Later' && l.status !== 'Gestopt')

  const greeting = () => {
    const h = now.getHours()
    if (h < 12) return 'Goedemorgen'
    if (h < 18) return 'Goedemiddag'
    return 'Goedenavond'
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .db { font-family: 'IBM Plex Sans', sans-serif; color: var(--text); }
        .db * { box-sizing: border-box; }

        .section-title {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px; letter-spacing: 0.9px;
          text-transform: uppercase; color: var(--text-muted);
          margin-bottom: 12px;
        }

        .stat-box {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; padding: 14px 16px;
          display: flex; flex-direction: column; gap: 3px;
        }
        .stat-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px; color: var(--text-muted);
          text-transform: uppercase; letter-spacing: 0.8px;
        }
        .stat-value {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 26px; font-weight: 600; line-height: 1;
        }
        .stat-sub { font-size: 11px; color: var(--text-muted); }

        .ld-block {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 10px; overflow: hidden;
          transition: border-color 0.15s;
          animation: fadeSlide 0.2s ease both;
        }
        .ld-block:hover { border-color: #444c56; }

        .subtaak-row {
          display: flex; align-items: center; gap: 10px;
          padding: 7px 18px; border-top: 1px solid #1c2330;
          transition: background 0.1s;
        }
        .subtaak-row:hover { background: #1a2030; }

        .check {
          width: 15px; height: 15px; border-radius: 3px;
          border: 1px solid #30363d; cursor: pointer; flex-shrink: 0;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.15s; background: transparent;
        }
        .check.done { background: var(--success); border-color: var(--success); }
        .check.done::after { content: '✓'; font-size: 9px; color: #0d1117; font-weight: 700; line-height: 1; }

        .skill-chip {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 14px;
          background: var(--surface2); border: 1px solid var(--border);
          border-radius: 8px; transition: border-color 0.15s;
        }
        .skill-chip:hover { border-color: #444c56; }

        .future-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 8px; padding: 11px 14px;
          display: flex; align-items: center; gap: 10px;
          transition: border-color 0.15s;
        }
        .future-card:hover { border-color: #444c56; }

        .open-link {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 11px; color: var(--text-muted);
          text-decoration: none; transition: color 0.15s;
          font-family: 'IBM Plex Mono', monospace;
        }
        .open-link:hover { color: #58a6ff; }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="db">

        {/* ── Greeting ──────────────────────────────────────────────────────── */}
        <div style={{ marginBottom: '28px' }}>
          <h1 style={{
            fontFamily: "'Crimson Pro', serif",
            fontSize: '26px', fontWeight: 600,
            color: 'var(--text)', letterSpacing: '-0.3px', marginBottom: '4px',
          }} suppressHydrationWarning>
            {greeting()}, Sunny
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)' }} suppressHydrationWarning>
            {now.toLocaleDateString('nl-NL', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>

        {/* ── KPI grid ──────────────────────────────────────────────────────── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '28px' }}>
          <div className="stat-box" style={{ borderLeft: '3px solid #58a6ff' }}>
            <div className="stat-label">Actief</div>
            <div className="stat-value" style={{ color: '#58a6ff' }}>{activeCount}</div>
            <div className="stat-sub">leerdoelen bezig</div>
          </div>
          <div className="stat-box" style={{ borderLeft: '3px solid #58a6ff' }}>
            <div className="stat-label">Hard skills</div>
            <div className="stat-value" style={{ color: '#58a6ff' }}>{hardCount}</div>
            <div className="stat-sub">geregistreerd</div>
          </div>
          <div className="stat-box" style={{ borderLeft: '3px solid #3fb950' }}>
            <div className="stat-label">Soft skills</div>
            <div className="stat-value" style={{ color: '#3fb950' }}>{softCount}</div>
            <div className="stat-sub">geregistreerd</div>
          </div>
          <div className="stat-box" style={{ borderLeft: '3px solid #d29922' }}>
            <div className="stat-label">Gem. voortgang</div>
            <div className="stat-value" style={{ color: '#d29922' }}>{avgVoortgang}%</div>
            <div className="stat-sub">{thisMonth} afgerond deze maand</div>
          </div>
        </div>

        {/* ── Week focus — Now leerdoelen ───────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div className="section-title" style={{ marginBottom: 0 }}>Week focus — Nu bezig</div>
            <Link href="/leerdoelen" className="open-link">
              Alle leerdoelen →
            </Link>
          </div>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)', fontSize: '13px' }}>Laden...</div>
          )}

          {!loading && nowLeerdoelen.length === 0 && (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              color: 'var(--text-muted)', fontSize: '13px',
              border: '1px dashed var(--border)', borderRadius: '10px',
            }}>
              Geen actieve leerdoelen in Now.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {nowLeerdoelen.map((ld, i) => {
              const subs = subtaken[ld.id] || []
              const doneSubs = subs.filter(s => s.voltooid).length
              const overdue = ld.status !== 'Afgerond' && new Date(ld.doeldatum) < now
              const linkedSkill = skills.find(s => s.id === ld.skill_id)
              const progressColor = ld.voortgang >= 100 ? '#3fb950' : '#58a6ff'
              const firstTag = ld.tags[0] || null

              return (
                <div
                  key={ld.id}
                  className="ld-block"
                  style={{
                    animationDelay: `${i * 0.05}s`,
                    borderLeft: overdue ? '3px solid #f85149' : undefined,
                  }}
                >
                  {/* Header */}
                  <div style={{ padding: '14px 18px 12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '7px', flexWrap: 'wrap', marginBottom: '3px' }}>
                          <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text)', lineHeight: 1.35 }}>
                            {ld.titel}
                          </span>
                          {firstTag && (
                            <span style={{
                              fontFamily: "'IBM Plex Mono', monospace",
                              fontSize: '10px', color: 'var(--text-muted)',
                              background: '#1c2330', border: '1px solid #2d333b',
                              borderRadius: '4px', padding: '1px 6px',
                            }}>{firstTag.naam}</span>
                          )}
                        </div>
                        {linkedSkill && (
                          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                            ↳ {linkedSkill.naam}
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: '5px', alignItems: 'center', flexShrink: 0 }}>
                        {overdue && <Badge label="Overdue" color="#f85149" />}
                        <Badge label={ld.prioriteit} color={PRIO_COLORS[ld.prioriteit]} />
                        <Badge
                          label={ld.status === 'Niet gestart' ? 'N/G' : ld.status}
                          color={STATUS_COLORS[ld.status]}
                        />
                      </div>
                    </div>

                    {/* Progress row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                      <ProgressBar pct={ld.voortgang} color={progressColor} height={3} />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: '11px', fontWeight: 600,
                        color: progressColor, minWidth: '32px', textAlign: 'right',
                      }}>{ld.voortgang}%</span>
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                        color: overdue ? '#f85149' : 'var(--text-muted)',
                        minWidth: '96px', textAlign: 'right',
                      }}>
                        {formatDeadline(ld.doeldatum)}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {subs.length > 0 && (
                        <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-muted)' }}>
                          {doneSubs}/{subs.length} taken
                        </span>
                      )}
                      <Link
                        href="/leerdoelen"
                        className="open-link"
                        style={{ marginLeft: 'auto' }}
                      >
                        Openen →
                      </Link>
                    </div>
                  </div>

                  {/* Subtaken */}
                  {subs.length > 0 && (
                    <div>
                      {subs.map(sub => {
                        const subOverdue = Boolean(sub.deadline && !sub.voltooid && new Date(sub.deadline) < now)
                        return (
                          <div
                            key={sub.id}
                            className="subtaak-row"
                            style={{ opacity: sub.voltooid ? 0.72 : 1 }}
                          >
                            <div
                              className={`check${sub.voltooid ? ' done' : ''}`}
                              onClick={() => toggleSubtaak(ld.id, sub.id, !sub.voltooid)}
                            />
                            <span style={{
                              fontSize: '13px',
                              color: sub.voltooid ? 'var(--text-muted)' : 'var(--text)',
                              flex: 1,
                              textDecoration: sub.voltooid ? 'line-through' : 'none',
                              textDecorationThickness: '1px',
                            }}>
                              {sub.titel}
                            </span>
                            {sub.deadline && (
                              <span style={{
                                fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                                color: subOverdue ? '#f85149' : 'var(--text-muted)',
                                flexShrink: 0,
                              }}>
                                {formatDeadline(sub.deadline)}
                              </span>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {subs.length === 0 && (
                    <div style={{
                      padding: '9px 18px', borderTop: '1px solid #1c2330',
                      fontSize: '12px', color: 'var(--text-muted)', fontStyle: 'italic',
                    }}>
                      Geen subtaken aangemaakt.
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* ── Skills in focus ───────────────────────────────────────────────── */}
        {linkedSkills.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <div className="section-title">Skills in focus</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {linkedSkills.sort((a, b) => b.niveau - a.niveau).map(skill => {
                const color = skill.categorie === 'hard' ? '#58a6ff' : '#3fb950'
                return (
                  <div key={skill.id} className="skill-chip">
                    <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, flexShrink: 0 }} />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{skill.naam}</span>
                    {skill.subcategorie && (
                      <span style={{
                        fontSize: '10px', color: 'var(--text-muted)',
                        background: '#1c2330', border: '1px solid #30363d',
                        borderRadius: '4px', padding: '1px 6px',
                      }}>{skill.subcategorie}</span>
                    )}
                    <NiveauDots niveau={skill.niveau} color={color} />
                    <span style={{
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: '11px', fontWeight: 600, color, minWidth: '24px', textAlign: 'right',
                    }}>{skill.niveau}/5</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ── Trend visualisatie ────────────────────────────────────────────── */}
        <div style={{ marginBottom: '32px' }}>
          <div className="section-title">Voortgang afgelopen 8 weken</div>
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '10px', padding: '16px 18px',
          }}>
            {loading
              ? <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Laden...</div>
              : <TrendChart leerdoelen={allLeerdoelen} subtaken={allSubtaken} />
            }
          </div>
        </div>

        {/* ── Toekomstoverzicht ─────────────────────────────────────────────── */}
        {(nextLd.length > 0 || laterLd.length > 0) && (
          <div style={{ marginBottom: '16px' }}>
            <div className="section-title">Toekomstoverzicht</div>

            {nextLd.length > 0 && (
              <div style={{ marginBottom: '16px' }}>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                  letterSpacing: '1px', textTransform: 'uppercase' as const,
                  color: '#58a6ff', marginBottom: '8px',
                }}>Next</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {nextLd.map(ld => (
                    <div key={ld.id} className="future-card">
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#58a6ff', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text)', flex: 1 }}>{ld.titel}</span>
                      <Badge label={ld.prioriteit} color={PRIO_COLORS[ld.prioriteit]} />
                      <span style={{
                        fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px',
                        color: 'var(--text-muted)', flexShrink: 0,
                      }}>{new Date(ld.doeldatum).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short' })}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {laterLd.length > 0 && (
              <div>
                <div style={{
                  fontFamily: "'IBM Plex Mono', monospace", fontSize: '9px',
                  letterSpacing: '1px', textTransform: 'uppercase' as const,
                  color: '#7d8590', marginBottom: '8px',
                }}>Later</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  {laterLd.map(ld => (
                    <div key={ld.id} className="future-card" style={{ opacity: 0.7 }}>
                      <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#7d8590', flexShrink: 0 }} />
                      <span style={{ fontSize: '13px', color: 'var(--text-muted)', flex: 1 }}>{ld.titel}</span>
                      <Badge label={ld.prioriteit} color={PRIO_COLORS[ld.prioriteit]} />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
