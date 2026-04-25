'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../../lib/supabase'
import { Tag } from '../components/TagSelector'

type Skill = {
  id: string
  naam: string
  categorie: string
  subcategorie: string | null
  niveau: number
  omschrijving: string | null
  certificaat_naam: string | null
  certificaat_url: string | null
  toon_in_portfolio: boolean
  tags: Tag[]
}

type Leerdoel = {
  id: string
  titel: string
  skill_id: string | null
  fase: string
  status: string
  voortgang: number
}

function NiveauDots({ niveau, color }: { niveau: number; color: string }) {
  return (
    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: '7px',
            height: '7px',
            borderRadius: '50%',
            background: i <= niveau ? color : '#1c2330',
            border: `1px solid ${i <= niveau ? color : '#2d333b'}`,
          }}
        />
      ))}
    </div>
  )
}

function RenderOmschrijving({ text }: { text: string }) {
  const lines = text.split('\n').filter(Boolean)
  const isBulletList = lines.some(line => line.trim().startsWith('-') || line.trim().startsWith('•'))

  const renderLine = (line: string): ReactNode => {
    const cleanLine = line.replace(/^[-•]\s*/, '')
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = cleanLine.split(urlRegex)

    return parts.map((part, index) =>
      urlRegex.test(part) ? (
        <a
          key={index}
          href={part}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            color: 'var(--accent)',
            textDecoration: 'underline',
            textDecorationColor: 'rgba(88,166,255,0.4)',
            wordBreak: 'break-all',
          }}
        >
          {part}
        </a>
      ) : (
        <span key={index}>{part}</span>
      )
    )
  }

  if (isBulletList) {
    return (
      <ul
        style={{
          margin: '4px 0 0 0',
          padding: '0 0 0 14px',
          listStyle: 'disc',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {lines.map((line, index) => (
          <li key={index} style={{ fontSize: '11px', color: '#768390', lineHeight: 1.5 }}>
            {renderLine(line)}
          </li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ fontSize: '11px', color: '#768390', marginTop: '3px', lineHeight: 1.5 }}>
      {lines.map((line, index) => (
        <span key={index}>
          {renderLine(line)}
          {index < lines.length - 1 && <br />}
        </span>
      ))}
    </div>
  )
}

function groupByTag<T extends { tags: Tag[] }>(items: T[]): { tag: Tag | null; items: T[] }[] {
  const groups: Map<string, { tag: Tag; items: T[] }> = new Map()
  const ungrouped: T[] = []

  for (const item of items) {
    if (item.tags.length === 0) {
      ungrouped.push(item)
    } else {
      const tag = item.tags[0]
      if (!groups.has(tag.id)) groups.set(tag.id, { tag, items: [] })
      groups.get(tag.id)?.items.push(item)
    }
  }

  const result: { tag: Tag | null; items: T[] }[] = []
  for (const group of groups.values()) result.push(group)
  result.sort((a, b) => a.tag!.naam.localeCompare(b.tag!.naam))
  if (ungrouped.length > 0) result.push({ tag: null, items: ungrouped })
  return result
}

function SkillRow({ skill, accent }: { skill: Skill; accent: string }) {
  const [certHovered, setCertHovered] = useState(false)

  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #2d333b',
        borderRadius: '8px',
        padding: '13px 15px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        transition: 'border-color 0.15s',
        borderLeft: `3px solid ${accent}`,
      }}
      onMouseEnter={event => {
        event.currentTarget.style.borderColor = '#444c56'
      }}
      onMouseLeave={event => {
        event.currentTarget.style.borderColor = '#2d333b'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#cdd9e5' }}>{skill.naam}</span>
          {skill.omschrijving && <RenderOmschrijving text={skill.omschrijving} />}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0, paddingTop: '2px' }}>
          <NiveauDots niveau={skill.niveau} color={accent} />
          <span
            style={{
              fontFamily: "'IBM Plex Mono', monospace",
              fontSize: '12px',
              fontWeight: 600,
              color: accent,
              minWidth: '28px',
              textAlign: 'right',
            }}
          >
            {skill.niveau}/5
          </span>
        </div>
      </div>

      {skill.certificaat_naam && (
        <div>
          {skill.certificaat_url ? (
            <a
              href={skill.certificaat_url}
              target="_blank"
              rel="noopener noreferrer"
              onMouseEnter={() => setCertHovered(true)}
              onMouseLeave={() => setCertHovered(false)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                fontWeight: 500,
                color: certHovered ? '#e6b84a' : '#d29922',
                background: 'rgba(210,153,34,0.1)',
                border: `1px solid ${certHovered ? 'rgba(210,153,34,0.6)' : 'rgba(210,153,34,0.3)'}`,
                borderRadius: '5px',
                padding: '3px 9px',
                textDecoration: 'none',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Certificaat</span>
              <span>{skill.certificaat_naam}</span>
              <svg
                viewBox="0 0 12 12"
                width="10"
                height="10"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                style={{ opacity: 0.8 }}
              >
                <path d="M2 10L10 2M10 2H5M10 2v5" />
              </svg>
            </a>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '11px',
                color: '#d29922',
                background: 'rgba(210,153,34,0.1)',
                border: '1px solid rgba(210,153,34,0.3)',
                borderRadius: '5px',
                padding: '3px 9px',
                whiteSpace: 'nowrap',
              }}
            >
              <span>Certificaat</span>
              <span>{skill.certificaat_naam}</span>
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function SkillSection({ title, skills, accent }: { title: string; skills: Skill[]; accent: string }) {
  const groups = groupByTag(skills)

  if (skills.length === 0) {
    return (
      <div className="pf-section">
        <div className="pf-section-header">
          <span className="pf-section-title">{title}</span>
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Nog geen skills toegevoegd.</div>
      </div>
    )
  }

  return (
    <div className="pf-section">
      <div className="pf-section-header">
        <span className="pf-section-title">{title}</span>
      </div>

      {groups.map(({ tag, items }) => (
        <div key={tag?.id ?? '__ungrouped'} style={{ marginTop: tag ? '20px' : '0' }}>
          {tag && <div className="pf-tag-label">{tag.naam}</div>}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {items.map(skill => (
              <SkillRow key={skill.id} skill={skill} accent={accent} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export default function PortfolioPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [leerdoelen, setLeerdoelen] = useState<Leerdoel[]>([])
  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchData() {
      try {
        setLoadError(null)

        const [{ data: skillsData, error: skillsError }, { data: leerdoelenData, error: leerdoelenError }] = await Promise.all([
          supabase.from('skills').select('*, skill_tags(tag_id, tags(id, naam))').order('niveau', { ascending: false }),
          supabase
            .from('leerdoelen')
            .select('id, titel, skill_id, fase, status, voortgang')
            .neq('status', 'Gestopt')
            .neq('status', 'Afgerond'),
        ])

        if (skillsError) throw skillsError
        if (leerdoelenError) throw leerdoelenError

        if (skillsData) {
          setSkills(
            skillsData
              .map((skill: Record<string, unknown>) => ({
                id: skill.id as string,
                naam: skill.naam as string,
                categorie: skill.categorie as string,
                subcategorie: skill.subcategorie as string | null,
                niveau: skill.niveau as number,
                omschrijving: skill.omschrijving as string | null,
                certificaat_naam: skill.certificaat_naam as string | null,
                certificaat_url: skill.certificaat_url as string | null,
                toon_in_portfolio: skill.toon_in_portfolio !== false,
                tags: ((skill.skill_tags as { tag_id: string; tags: Tag }[]) || [])
                  .filter(item => item.tags)
                  .map(item => item.tags),
              }))
              .filter(skill => skill.toon_in_portfolio)
          )
        }

        if (leerdoelenData) {
          setLeerdoelen(
            leerdoelenData.map((leerdoel: Record<string, unknown>) => ({
              id: leerdoel.id as string,
              titel: leerdoel.titel as string,
              skill_id: leerdoel.skill_id as string | null,
              fase: leerdoel.fase as string,
              status: leerdoel.status as string,
              voortgang: leerdoel.voortgang as number,
            }))
          )
        }
      } catch (error) {
        console.error('Portfolio data kon niet geladen worden:', error)
        setLoadError('Portfoliogegevens konden niet geladen worden.')
      } finally {
        setLoading(false)
      }
    }

    void fetchData()
  }, [])

  async function exportPDF() {
    setExporting(true)
    try {
      window.print()
    } finally {
      setExporting(false)
    }
  }

  const hardSkills = skills.filter(skill => skill.categorie === 'hard')
  const softSkills = skills.filter(skill => skill.categorie === 'soft')
  const nowLeerdoelen = leerdoelen
    .filter(leerdoel => leerdoel.fase === 'Now')
    .sort((a, b) => b.voortgang - a.voortgang || a.titel.localeCompare(b.titel))
  const focusSkills = skills
    .filter(skill => nowLeerdoelen.some(leerdoel => leerdoel.skill_id === skill.id))
    .sort((a, b) => a.naam.localeCompare(b.naam))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&family=Crimson+Pro:ital,wght@0,300;0,400;0,600;1,300;1,400&display=swap');

        .pf { font-family: 'IBM Plex Sans', sans-serif; color: var(--text); }
        .pf * { box-sizing: border-box; }

        .pf-hero { padding: 40px 0 36px; border-bottom: 1px solid var(--border); margin-bottom: 36px; animation: pfFade 0.5s ease both; }
        .pf-hero-top { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 8px; }
        .pf-hero-name-wrap { display: flex; align-items: center; gap: 12px; flex-wrap: wrap; }
        .pf-name { font-family: 'Crimson Pro', serif; font-size: 38px; font-weight: 600; letter-spacing: -0.5px; color: var(--text); line-height: 1.1; margin-bottom: 0; }
        .pf-role { font-family: 'IBM Plex Mono', monospace; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: var(--accent); margin-bottom: 20px; }
        .pf-linkedin {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 5px 10px;
          border-radius: 999px;
          border: 1px solid rgba(88,166,255,0.25);
          background: rgba(88,166,255,0.08);
          color: #58a6ff;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          text-decoration: none;
          transition: all 0.15s ease;
          white-space: nowrap;
        }
        .pf-linkedin:hover { border-color: rgba(88,166,255,0.45); background: rgba(88,166,255,0.14); color: #79c0ff; }
        .pf-bio { font-size: 14px; line-height: 1.75; color: var(--text-muted); max-width: 580px; }
        .pf-bio strong { color: var(--text); font-weight: 500; }

        .pf-section { margin-bottom: 40px; animation: pfFade 0.5s ease both; }
        .pf-section-header { display: flex; align-items: baseline; gap: 10px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid var(--border); }
        .pf-section-title { font-family: 'Crimson Pro', serif; font-size: 20px; font-weight: 600; color: var(--text); }

        .pf-tag-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #444c56;
          margin-bottom: 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .pf-tag-label::after { content: ''; flex: 1; height: 1px; background: #1c2330; }

        .pf-ld-card { padding: 13px 16px; background: var(--surface); border: 1px solid var(--border); border-radius: 8px; border-left: 3px solid #3fb950; animation: pfFade 0.3s ease both; transition: border-color 0.15s; }
        .pf-ld-card:hover { border-color: #444c56; }
        .pf-ld-titel { font-size: 14px; font-weight: 600; color: var(--text); margin-bottom: 5px; }
        .pf-ld-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .pf-ld-tag { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.4px; padding: 2px 7px; border-radius: 4px; text-transform: uppercase; }
        .pf-ld-skill { font-size: 11px; color: var(--text-muted); display: flex; align-items: center; gap: 6px; }

        .pf-focus-row { display: flex; align-items: flex-start; gap: 10px; flex-wrap: wrap; margin-top: 16px; }
        .pf-focus-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.7px; text-transform: uppercase; color: var(--text-muted); padding-top: 3px; }
        .pf-focus-skills { display: flex; gap: 6px; flex-wrap: wrap; }
        .pf-focus-chip { display: inline-flex; align-items: center; gap: 6px; padding: 5px 10px; border-radius: 999px; background: #1c2330; border: 1px solid #2d333b; font-size: 11px; color: var(--text); }
        .pf-focus-dot { width: 6px; height: 6px; border-radius: 50%; background: #58a6ff; flex-shrink: 0; }

        .pf-export-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: transparent;
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 8px 16px;
          color: var(--text-muted);
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          cursor: pointer;
          transition: all 0.15s;
        }
        .pf-export-btn:hover { border-color: #444c56; color: var(--text); }

        .pf-footer {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          font-family: 'IBM Plex Mono', monospace;
          font-size: 10px;
          color: var(--text-muted);
          letter-spacing: 0.5px;
          display: flex;
          justify-content: flex-end;
          align-items: center;
        }

        @keyframes pfFade { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }

        @media print {
          body { background: white !important; color: #111 !important; }
          nav { display: none !important; }
          .pf-export-btn { display: none !important; }
          .pf { color: #111; }
          .pf-name { color: #111; }
          .pf-section-title { color: #111; }
          .pf-bio { color: #444; }
          .pf-role { color: #333; }
          * { animation: none !important; }
        }

        @media (max-width: 640px) {
          .pf-name { font-size: 28px; }
          .pf-hero-top { flex-direction: column; align-items: stretch; }
          .pf-footer { justify-content: flex-start; }
        }
      `}</style>

      <div className="pf">
        <div className="pf-hero">
          <div className="pf-hero-top">
            <div className="pf-hero-name-wrap">
              <div className="pf-name">Sunny Bhatia</div>
              <a
                href="https://www.linkedin.com/in/apoorvsunnybhatia/?skipRedirect=true"
                target="_blank"
                rel="noopener noreferrer"
                className="pf-linkedin"
                aria-label="LinkedIn profiel van Sunny Bhatia"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
                  <path d="M4.98 3.5A2.48 2.48 0 1 0 5 8.46 2.48 2.48 0 0 0 4.98 3.5ZM3 9h4v12H3zm7 0h3.83v1.64h.05c.53-1.01 1.84-2.08 3.79-2.08 4.05 0 4.8 2.66 4.8 6.12V21h-4v-5.66c0-1.35-.03-3.09-1.88-3.09-1.89 0-2.18 1.47-2.18 2.99V21h-4z" />
                </svg>
                <span>LinkedIn</span>
              </a>
            </div>

            <button className="pf-export-btn" onClick={exportPDF} disabled={exporting}>
              <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10v3a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1v-3M8 2v8M5 7l3 3 3-3" />
              </svg>
              {exporting ? 'Exporteren...' : 'Exporteer PDF'}
            </button>
          </div>

          <div className="pf-role">Consultant · Data Management · Digital Transformation &amp; AI</div>
          <p className="pf-bio">
            Consultant met een focus op <strong>digitale transformaties</strong> &amp; <strong>data management</strong>.
            Ik verbind bedrijfsvraagstukken met data-gedreven oplossingen, van procesoptimalisatie en rapportage tot
            strategische implementaties. Ik werk actief aan professionele certificeringen en blijf mijn technische en
            analytische skills continu ontwikkelen.
          </p>
        </div>

        {loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)', padding: '20px 0' }}>Laden...</div>}
        {!loading && loadError && <div style={{ fontSize: '13px', color: '#f85149', padding: '4px 0 20px' }}>{loadError}</div>}

        {!loading && !loadError && (
          <>
            <SkillSection title="Hard Skills" skills={hardSkills} accent="#58a6ff" />
            <SkillSection title="Soft Skills" skills={softSkills} accent="#3fb950" />
          </>
        )}

        {!loadError && <div className="pf-section" style={{ animationDelay: '0.2s' }}>
          <div className="pf-section-header">
            <span className="pf-section-title">Lopende ontwikkeling</span>
          </div>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginBottom: '14px', lineHeight: 1.6 }}>
            Alle huidige leerdoelen in de fase Now.
          </p>

          {loading && <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Laden...</div>}
          {!loading && nowLeerdoelen.length === 0 && (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', fontStyle: 'italic' }}>Geen huidige leerdoelen in Now.</div>
          )}

          {!loading && nowLeerdoelen.length > 0 && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '7px' }}>
                {nowLeerdoelen.map((leerdoel, index) => {
                  const skill = skills.find(item => item.id === leerdoel.skill_id)

                  return (
                    <div key={leerdoel.id} className="pf-ld-card" style={{ animationDelay: `${0.2 + index * 0.05}s` }}>
                      <div className="pf-ld-titel">{leerdoel.titel}</div>
                      <div className="pf-ld-meta">
                        <span className="pf-ld-skill">
                          <span style={{ color: 'var(--border)' }}>Skill</span>
                          <span>{skill?.naam || 'Niet gekoppeld'}</span>
                        </span>
                        <span
                          className="pf-ld-tag"
                          style={{
                            background: 'rgba(88,166,255,0.1)',
                            color: '#58a6ff',
                            border: '1px solid rgba(88,166,255,0.2)',
                          }}
                        >
                          {leerdoel.voortgang}%
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>

              {focusSkills.length > 0 && (
                <div className="pf-focus-row">
                  <div className="pf-focus-label">Focust momenteel op</div>
                  <div className="pf-focus-skills">
                    {focusSkills.map(skill => (
                      <span key={skill.id} className="pf-focus-chip">
                        <span className="pf-focus-dot" />
                        <span>{skill.naam}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>}

        <div className="pf-footer">
          <span suppressHydrationWarning>
            Profiel bijgewerkt {new Date().toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' })}
          </span>
        </div>
      </div>
    </>
  )
}
