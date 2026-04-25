'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import TagSelector, { Tag } from '../components/TagSelector'

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

type ActiveLeerdoel = {
  id: string
  skill_id: string | null
  titel: string
  voortgang: number
  status: string
}

function RenderOmschrijving({ text }: { text: string }) {
  const lines = text.split('\n').filter(Boolean)
  const isBulletList = lines.some(l => l.trim().startsWith('-') || l.trim().startsWith('•'))

  const renderLine = (line: string): React.ReactNode => {
    const cleanLine = line.replace(/^[-•]\s*/, '')
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const parts = cleanLine.split(urlRegex)
    return parts.map((part, i) =>
      urlRegex.test(part) ? (
        <a key={i} href={part} target="_blank" rel="noopener noreferrer"
          style={{ color: 'var(--accent)', textDecoration: 'underline', textDecorationColor: 'rgba(88,166,255,0.4)', wordBreak: 'break-all' }}>
          {part}
        </a>
      ) : <span key={i}>{part}</span>
    )
  }

  if (isBulletList) {
    return (
      <ul style={{ margin: '4px 0 0 0', padding: '0 0 0 14px', listStyle: 'disc', display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {lines.map((line, i) => (
          <li key={i} style={{ fontSize: '11px', color: '#768390', lineHeight: 1.5 }}>{renderLine(line)}</li>
        ))}
      </ul>
    )
  }

  return (
    <div style={{ fontSize: '11px', color: '#768390', marginTop: '3px', lineHeight: 1.5 }}>
      {lines.map((line, i) => (
        <span key={i}>{renderLine(line)}{i < lines.length - 1 && <br />}</span>
      ))}
    </div>
  )
}

function EditModal({ skill, allTags, onClose, onSave, onTagCreated, onTagDeleted }: {
  skill: Skill
  allTags: Tag[]
  onClose: () => void
  onSave: () => Promise<void>
  onTagCreated: (tag: Tag) => void
  onTagDeleted: (tagId: string) => void
}) {
  const [naam, setNaam] = useState(skill.naam)
  const [categorie, setCategorie] = useState(skill.categorie)
  const [niveau, setNiveau] = useState(skill.niveau)
  const [omschrijving, setOmschrijving] = useState(skill.omschrijving ?? '')
  const [certNaam, setCertNaam] = useState(skill.certificaat_naam ?? '')
  const [certUrl, setCertUrl] = useState(skill.certificaat_url ?? '')
  const [toonInPortfolio, setToonInPortfolio] = useState(skill.toon_in_portfolio)
  const [selectedTags, setSelectedTags] = useState<Tag[]>(skill.tags)
  const [saving, setSaving] = useState(false)

  async function opslaan() {
    if (!naam) return
    setSaving(true)

    await supabase.from('skills').update({
      naam, categorie, niveau,
      omschrijving: omschrijving || null,
      certificaat_naam: certNaam || null,
      certificaat_url: certUrl || null,
      toon_in_portfolio: toonInPortfolio,
    }).eq('id', skill.id)

    await supabase.from('skill_tags').delete().eq('skill_id', skill.id)
    if (selectedTags.length > 0) {
      await supabase.from('skill_tags').insert(
        selectedTags.map(t => ({ skill_id: skill.id, tag_id: t.id }))
      )
    }

    await onSave()
    setSaving(false)
    onClose()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.65)', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}
      onClick={onClose}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: '12px', padding: '24px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#768390', textTransform: 'uppercase', letterSpacing: '0.8px' }}>
            Skill bewerken
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#768390', cursor: 'pointer', fontSize: '20px', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '13px' }}>
          <Field label="Naam">
            <input className="form-input" value={naam} onChange={e => setNaam(e.target.value)} />
          </Field>
          <Field label="Tag">
            <TagSelector
              selectedTags={selectedTags}
              onChange={setSelectedTags}
              allTags={allTags}
              onTagCreated={onTagCreated}
              onTagDeleted={onTagDeleted}
            />
          </Field>
          <Field label="Omschrijving">
            <textarea className="form-input" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} rows={3} style={{ resize: 'vertical' }} />
          </Field>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', fontSize: '13px', color: '#cdd9e5', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={toonInPortfolio}
              onChange={e => setToonInPortfolio(e.target.checked)}
              style={{ accentColor: '#58a6ff', width: '15px', height: '15px', cursor: 'pointer' }}
            />
            Tonen in portfolio
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <Field label="Categorie">
              <div style={{ display: 'flex', gap: '6px' }}>
                {['hard', 'soft'].map(c => (
                  <button key={c} onClick={() => setCategorie(c)} style={{
                    padding: '7px 16px', borderRadius: '7px', border: '1px solid',
                    borderColor: categorie === c ? 'rgba(88,166,255,0.4)' : '#2d333b',
                    background: categorie === c ? 'rgba(88,166,255,0.08)' : 'transparent',
                    color: categorie === c ? '#58a6ff' : '#768390',
                    fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize'
                  }}>{c}</button>
                ))}
              </div>
            </Field>
            <Field label="Niveau">
              <div style={{ display: 'flex', gap: '4px' }}>
                {[1,2,3,4,5].map(i => (
                  <button key={i} onClick={() => setNiveau(i)} style={{
                    width: '34px', height: '34px', borderRadius: '6px', border: '1px solid',
                    borderColor: niveau === i ? 'rgba(88,166,255,0.4)' : '#2d333b',
                    background: niveau === i ? 'rgba(88,166,255,0.08)' : 'transparent',
                    color: niveau === i ? '#58a6ff' : '#768390',
                    fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, cursor: 'pointer'
                  }}>{i}</button>
                ))}
              </div>
            </Field>
          </div>

          <div style={{ borderTop: '1px solid #2d333b', paddingTop: '13px', marginTop: '2px' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#768390', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '10px' }}>
              Certificaat (optioneel)
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <Field label="Naam certificaat / diploma">
                <input className="form-input" value={certNaam} onChange={e => setCertNaam(e.target.value)} placeholder="bijv. Microsoft PL-300" />
              </Field>
              <Field label="URL (bewijsstuk, Credly, LinkedIn)">
                <input className="form-input" value={certUrl} onChange={e => setCertUrl(e.target.value)} placeholder="https://..." />
              </Field>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '4px' }}>
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid #2d333b', borderRadius: '7px', padding: '9px 16px', color: '#768390', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', cursor: 'pointer' }}>Annuleren</button>
            <button onClick={opslaan} disabled={saving || !naam} style={{ background: '#58a6ff', border: 'none', borderRadius: '7px', padding: '9px 18px', color: '#0d1117', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', fontWeight: 600, cursor: (saving || !naam) ? 'not-allowed' : 'pointer', opacity: (saving || !naam) ? 0.4 : 1 }}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
      <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>{label}</label>
      {children}
    </div>
  )
}

const HARD_COLOR = '#58a6ff'
const SOFT_COLOR = '#3fb950'

function MiniProgress({ pct, color }: { pct: number; color: string }) {
  const r = 7
  const circ = 2 * Math.PI * r
  const dash = (pct / 100) * circ
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" style={{ flexShrink: 0 }}>
      <circle cx="9" cy="9" r={r} fill="none" stroke="#1c2330" strokeWidth="2.5" />
      <circle cx="9" cy="9" r={r} fill="none" stroke={color} strokeWidth="2.5"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round" transform="rotate(-90 9 9)" />
    </svg>
  )
}

function SkillCard({ skill, onDelete, onEdit, onTogglePortfolio, accent, activeLeerdoelen }: {
  skill: Skill
  onDelete: (id: string) => void
  onEdit: (skill: Skill) => void
  onTogglePortfolio: (skill: Skill, visible: boolean) => Promise<void>
  accent: string
  activeLeerdoelen: ActiveLeerdoel[]
}) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [certHovered, setCertHovered] = useState(false)
  const [savingPortfolio, setSavingPortfolio] = useState(false)

  const linkedLd = activeLeerdoelen.filter(l => l.skill_id === skill.id && l.status !== 'Afgerond' && l.status !== 'Gestopt')

  function handleDelete() {
    if (!confirmDelete) {
      setConfirmDelete(true)
      timerRef.current = setTimeout(() => setConfirmDelete(false), 2500)
    } else {
      if (timerRef.current) clearTimeout(timerRef.current)
      onDelete(skill.id)
    }
  }

  async function handlePortfolioToggle(checked: boolean) {
    setSavingPortfolio(true)
    try {
      await onTogglePortfolio(skill, checked)
    } finally {
      setSavingPortfolio(false)
    }
  }

  return (
    <div style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: '8px', padding: '13px 15px', display: 'flex', flexDirection: 'column', gap: '8px', transition: 'border-color 0.15s', animation: 'fadeSlide 0.22s ease both', borderLeft: `3px solid ${accent}` }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = '#444c56')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = '#2d333b')}>

      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Naam — geen inline tags meer, die staan al in de groepheader */}
          <span style={{ fontSize: '14px', fontWeight: 500, color: '#cdd9e5' }}>{skill.naam}</span>
          {skill.omschrijving && <RenderOmschrijving text={skill.omschrijving} />}
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', marginTop: '8px', fontSize: '11px', color: savingPortfolio ? '#444c56' : '#768390', cursor: savingPortfolio ? 'wait' : 'pointer' }}>
            <input
              type="checkbox"
              checked={skill.toon_in_portfolio}
              disabled={savingPortfolio}
              onChange={e => void handlePortfolioToggle(e.target.checked)}
              style={{ accentColor: accent, width: '14px', height: '14px', cursor: savingPortfolio ? 'wait' : 'pointer' }}
            />
            In portfolio tonen
          </label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, paddingTop: '1px' }}>
          <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            {[1,2,3,4,5].map(j => (
              <div key={j} style={{ width: '7px', height: '7px', borderRadius: '50%', background: j <= skill.niveau ? accent : '#1c2330', border: `1px solid ${j <= skill.niveau ? accent : '#2d333b'}` }} />
            ))}
          </div>
          <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, color: accent, minWidth: '28px', textAlign: 'right' }}>{skill.niveau}/5</span>

          <button onClick={() => onEdit(skill)} title="Bewerken"
            style={{ background: 'none', border: 'none', color: '#444c56', cursor: 'pointer', fontSize: '14px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', transition: 'all 0.15s', padding: 0 }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(88,166,255,0.1)'; e.currentTarget.style.color = '#58a6ff' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#444c56' }}>✏️</button>

          <button onClick={handleDelete} title={confirmDelete ? 'Nogmaals klikken om te verwijderen' : 'Verwijderen'}
            style={{ background: confirmDelete ? 'rgba(224,82,82,0.15)' : 'none', border: confirmDelete ? '1px solid rgba(224,82,82,0.4)' : 'none', color: confirmDelete ? '#e05252' : '#444c56', cursor: 'pointer', fontSize: '16px', width: '26px', height: '26px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '5px', transition: 'all 0.15s', padding: 0, lineHeight: 1 }}
            onMouseEnter={e => { if (!confirmDelete) { e.currentTarget.style.background = 'rgba(224,82,82,0.1)'; e.currentTarget.style.color = '#e05252' }}}
            onMouseLeave={e => { if (!confirmDelete) { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#444c56' }}}>
            {confirmDelete ? '✓?' : '×'}
          </button>
        </div>
      </div>

      {(skill.certificaat_naam || linkedLd.length > 0) && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', flexWrap: 'wrap' }}>
          {skill.certificaat_naam ? (
            skill.certificaat_url ? (
              <a href={skill.certificaat_url} target="_blank" rel="noopener noreferrer"
                onMouseEnter={() => setCertHovered(true)} onMouseLeave={() => setCertHovered(false)}
                style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', fontWeight: 500, color: certHovered ? '#e6b84a' : '#d29922', background: 'rgba(210,153,34,0.1)', border: `1px solid ${certHovered ? 'rgba(210,153,34,0.6)' : 'rgba(210,153,34,0.3)'}`, borderRadius: '5px', padding: '3px 9px', textDecoration: 'none', transition: 'all 0.15s', cursor: 'pointer', whiteSpace: 'nowrap' }}>
                🎓 {skill.certificaat_naam}
                <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.8 }}>
                  <path d="M2 10L10 2M10 2H5M10 2v5" />
                </svg>
              </a>
            ) : (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '11px', color: '#d29922', background: 'rgba(210,153,34,0.1)', border: '1px solid rgba(210,153,34,0.3)', borderRadius: '5px', padding: '3px 9px', whiteSpace: 'nowrap' }}>
                🎓 {skill.certificaat_naam}
              </span>
            )
          ) : <div />}

          {linkedLd.length > 0 && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              {linkedLd.map(ld => (
                <div key={ld.id} title={`${ld.titel} — ${ld.voortgang}%`}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', fontSize: '10px', color: '#768390', background: '#1c2330', border: '1px solid #2d333b', borderRadius: '5px', padding: '2px 7px', whiteSpace: 'nowrap', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  <MiniProgress pct={ld.voortgang} color={accent} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ld.titel}</span>
                  <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: accent, flexShrink: 0 }}>{ld.voortgang}%</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

function groupByTag(skills: Skill[]): { tag: Tag | null; skills: Skill[] }[] {
  const groups: Map<string, { tag: Tag; skills: Skill[] }> = new Map()
  const ungrouped: Skill[] = []

  for (const skill of skills) {
    if (skill.tags.length === 0) {
      ungrouped.push(skill)
    } else {
      const tag = skill.tags[0]
      if (!groups.has(tag.id)) groups.set(tag.id, { tag, skills: [] })
      groups.get(tag.id)!.skills.push(skill)
    }
  }

  const result: { tag: Tag | null; skills: Skill[] }[] = []
  for (const g of groups.values()) result.push(g)
  result.sort((a, b) => a.tag!.naam.localeCompare(b.tag!.naam))
  if (ungrouped.length > 0) result.push({ tag: null, skills: ungrouped })
  return result
}

export default function SkillsPage() {
  const [skills, setSkills] = useState<Skill[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [activeLeerdoelen, setActiveLeerdoelen] = useState<ActiveLeerdoel[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editSkill, setEditSkill] = useState<Skill | null>(null)

  const [naam, setNaam] = useState('')
  const [categorie, setCategorie] = useState('hard')
  const [niveau, setNiveau] = useState(3)
  const [omschrijving, setOmschrijving] = useState('')
  const [certNaam, setCertNaam] = useState('')
  const [certUrl, setCertUrl] = useState('')
  const [toonInPortfolio, setToonInPortfolio] = useState(true)
  const [formTags, setFormTags] = useState<Tag[]>([])
  const [opslaan, setOpslaan] = useState(false)

  const [activeTab, setActiveTab] = useState<'hard' | 'soft'>('hard')
  const [sortMode, setSortMode] = useState<'niveau' | 'naam'>('niveau')

  function handleTagDeleted(tagId: string) {
    setAllTags(prev => prev.filter(tag => tag.id !== tagId))
    setFormTags(prev => prev.filter(tag => tag.id !== tagId))
    setSkills(prev => prev.map(skill => ({
      ...skill,
      tags: skill.tags.filter(tag => tag.id !== tagId),
    })))
    setEditSkill(prev => prev ? {
      ...prev,
      tags: prev.tags.filter(tag => tag.id !== tagId),
    } : null)
  }

  const fetchSkills = useCallback(async () => {
    const [{ data: skillsData }, { data: ldData }, { data: tagsData }] = await Promise.all([
      supabase.from('skills').select('*, skill_tags(tag_id, tags(id, naam))'),
      supabase.from('leerdoelen').select('id, skill_id, titel, voortgang, status').eq('fase', 'Now'),
      supabase.from('tags').select('*').order('naam'),
    ])

    if (skillsData) {
      const mapped: Skill[] = skillsData.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        naam: s.naam as string,
        categorie: s.categorie as string,
        subcategorie: s.subcategorie as string | null,
        niveau: s.niveau as number,
        omschrijving: s.omschrijving as string | null,
        certificaat_naam: s.certificaat_naam as string | null,
        certificaat_url: s.certificaat_url as string | null,
        toon_in_portfolio: s.toon_in_portfolio !== false,
        tags: ((s.skill_tags as { tag_id: string; tags: Tag }[]) || [])
          .filter((st) => st.tags)
          .map((st) => st.tags),
      }))
      setSkills(mapped)
    }
    if (ldData) setActiveLeerdoelen(ldData)
    if (tagsData) setAllTags(tagsData)
    setLoading(false)
  }, [])

  useEffect(() => {
    const loadSkills = async () => {
      await fetchSkills()
    }

    void loadSkills()
  }, [fetchSkills])

  async function skillToevoegen() {
    if (!naam) return
    setOpslaan(true)
    const { data: newSkill } = await supabase.from('skills').insert({
      naam, categorie, niveau,
      omschrijving: omschrijving || null,
      certificaat_naam: certNaam || null,
      certificaat_url: certUrl || null,
      toon_in_portfolio: toonInPortfolio,
    }).select().single()

    if (newSkill && formTags.length > 0) {
      await supabase.from('skill_tags').insert(
        formTags.map(t => ({ skill_id: newSkill.id, tag_id: t.id }))
      )
    }

    resetForm()
    setOpslaan(false)
    fetchSkills()
  }

  function resetForm() {
    setNaam(''); setNiveau(3); setOmschrijving('')
    setCertNaam(''); setCertUrl(''); setFormTags([])
    setToonInPortfolio(true)
    setShowForm(false)
  }

  async function skillVerwijderen(id: string) {
    await supabase.from('skills').delete().eq('id', id)
    fetchSkills()
  }

  async function togglePortfolioSkill(skill: Skill, visible: boolean) {
    await supabase.from('skills').update({ toon_in_portfolio: visible }).eq('id', skill.id)
    setSkills(prev => prev.map(item => (
      item.id === skill.id ? { ...item, toon_in_portfolio: visible } : item
    )))
    setEditSkill(prev => (
      prev && prev.id === skill.id ? { ...prev, toon_in_portfolio: visible } : prev
    ))
  }

  const hard = skills.filter(s => s.categorie === 'hard')
  const soft = skills.filter(s => s.categorie === 'soft')

  function sorted(list: Skill[]) {
    return [...list].sort((a, b) =>
      sortMode === 'niveau' ? b.niveau - a.niveau : a.naam.localeCompare(b.naam)
    )
  }

  const accent = activeTab === 'hard' ? HARD_COLOR : SOFT_COLOR
  const groups = groupByTag(sorted(activeTab === 'hard' ? hard : soft))

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .sk * { box-sizing: border-box; }
        .sk { font-family: 'IBM Plex Sans', sans-serif; color: #cdd9e5; }

        .form-input {
          background: #0d1117;
          border: 1px solid #2d333b;
          border-radius: 7px;
          padding: 9px 11px;
          color: #cdd9e5;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          outline: none;
          width: 100%;
          transition: border-color 0.15s;
        }
        .form-input:focus { border-color: #58a6ff; }
        .form-input::placeholder { color: #444c56; }

        .tag-group-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #768390;
          padding: 16px 0 8px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tag-group-label::after {
          content: '';
          flex: 1;
          height: 1px;
          background: #1c2330;
        }

        @keyframes fadeSlide {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="sk">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '22px', fontWeight: 600, color: '#cdd9e5', letterSpacing: '-0.3px' }}>Skills</h1>
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', background: '#161b22', border: '1px solid #2d333b', borderRadius: '7px', padding: '3px' }}>
              {(['niveau', 'naam'] as const).map(m => (
                <button key={m} onClick={() => setSortMode(m)} style={{ padding: '5px 12px', borderRadius: '5px', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '12px', background: sortMode === m ? '#1c2330' : 'transparent', color: sortMode === m ? '#cdd9e5' : '#768390', transition: 'all 0.15s', textTransform: 'capitalize' }}>
                  {m === 'niveau' ? '↓ Niveau' : 'A–Z'}
                </button>
              ))}
            </div>
            {showForm
              ? <button onClick={() => { setShowForm(false); resetForm() }} style={{ background: 'transparent', border: '1px solid #2d333b', borderRadius: '7px', padding: '9px 16px', color: '#768390', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', cursor: 'pointer' }}>Annuleren</button>
              : <button onClick={() => setShowForm(true)} style={{ background: '#58a6ff', border: 'none', borderRadius: '7px', padding: '9px 18px', color: '#0d1117', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', fontWeight: 600, cursor: 'pointer' }}>+ Toevoegen</button>
            }
          </div>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '24px' }}>
          {[{ label: 'Hard skills', value: hard.length, color: HARD_COLOR }, { label: 'Soft skills', value: soft.length, color: SOFT_COLOR }].map(s => (
            <div key={s.label} style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: '10px', padding: '16px 18px', borderLeft: `3px solid ${s.color}` }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#768390', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '8px' }}>{s.label}</div>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '32px', fontWeight: 600, color: s.color, lineHeight: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Add form */}
        {showForm && (
          <div style={{ background: '#161b22', border: '1px solid #2d333b', borderRadius: '10px', padding: '20px', marginBottom: '24px', animation: 'fadeSlide 0.2s ease both' }}>
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: '#768390', marginBottom: '16px' }}>Nieuwe skill</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Naam</label>
                <input className="form-input" type="text" value={naam} onChange={e => setNaam(e.target.value)} placeholder="bijv. Power BI" />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Tag</label>
                <TagSelector
                  selectedTags={formTags}
                  onChange={setFormTags}
                  allTags={allTags}
                  onTagCreated={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.naam.localeCompare(b.naam)))}
                  onTagDeleted={handleTagDeleted}
                />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginBottom: '14px' }}>
              <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Omschrijving</label>
              <textarea className="form-input" value={omschrijving} onChange={e => setOmschrijving(e.target.value)} placeholder="- Eerste punt&#10;- Tweede punt" rows={3} style={{ resize: 'vertical' }} />
            </div>

            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '10px', marginBottom: '14px', fontSize: '13px', color: '#cdd9e5', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={toonInPortfolio}
                onChange={e => setToonInPortfolio(e.target.checked)}
                style={{ accentColor: '#58a6ff', width: '15px', height: '15px', cursor: 'pointer' }}
              />
              Tonen in portfolio
            </label>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Categorie</label>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {['hard', 'soft'].map(c => (
                    <button key={c} onClick={() => setCategorie(c)} style={{ padding: '8px 20px', borderRadius: '7px', border: '1px solid', borderColor: categorie === c ? 'rgba(88,166,255,0.4)' : '#2d333b', background: categorie === c ? 'rgba(88,166,255,0.08)' : 'transparent', color: categorie === c ? '#58a6ff' : '#768390', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', cursor: 'pointer', textTransform: 'capitalize' }}>{c}</button>
                  ))}
                </div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Niveau</label>
                <div style={{ display: 'flex', gap: '5px' }}>
                  {[1,2,3,4,5].map(i => (
                    <button key={i} onClick={() => setNiveau(i)} style={{ width: '34px', height: '34px', borderRadius: '6px', border: '1px solid', borderColor: niveau === i ? 'rgba(88,166,255,0.4)' : '#2d333b', background: niveau === i ? 'rgba(88,166,255,0.08)' : 'transparent', color: niveau === i ? '#58a6ff' : '#768390', fontFamily: "'IBM Plex Mono', monospace", fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>{i}</button>
                  ))}
                </div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid #2d333b', paddingTop: '16px', marginBottom: '18px' }}>
              <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: '#768390', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: '12px' }}>🎓 Certificaat (optioneel)</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>Naam certificaat</label>
                  <input className="form-input" value={certNaam} onChange={e => setCertNaam(e.target.value)} placeholder="bijv. Microsoft PL-300" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <label style={{ fontSize: '11px', color: '#768390', fontWeight: 500 }}>URL</label>
                  <input className="form-input" value={certUrl} onChange={e => setCertUrl(e.target.value)} placeholder="https://..." />
                </div>
              </div>
            </div>

            <button onClick={skillToevoegen} disabled={opslaan || !naam} style={{ background: '#58a6ff', border: 'none', borderRadius: '7px', padding: '9px 18px', color: '#0d1117', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', fontWeight: 600, cursor: (opslaan || !naam) ? 'not-allowed' : 'pointer', opacity: (opslaan || !naam) ? 0.4 : 1 }}>
              {opslaan ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        )}

        {/* Tab toggle */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', background: '#161b22', border: '1px solid #2d333b', borderRadius: '10px', padding: '4px', gap: '4px' }}>
            {(['hard', 'soft'] as const).map(tab => {
              const active = activeTab === tab
              const color = tab === 'hard' ? HARD_COLOR : SOFT_COLOR
              return (
                <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '10px 36px', borderRadius: '7px', border: 'none', cursor: 'pointer', fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '13px', fontWeight: active ? 600 : 500, background: active ? color : 'transparent', color: active ? '#0d1117' : '#768390', transition: 'all 0.18s ease', boxShadow: active ? `0 1px 6px ${color}40` : 'none' }}>
                  {tab === 'hard' ? 'Hard skills' : 'Soft skills'}
                </button>
              )
            })}
          </div>
        </div>

        {/* Skill list grouped by tag */}
        {loading && <div style={{ textAlign: 'center', padding: '48px 0', color: '#768390', fontSize: '13px' }}>Laden...</div>}

        {!loading && groups.length === 0 && (
          <div style={{ textAlign: 'center', padding: '48px 0', color: '#768390', fontSize: '13px' }}>Nog geen {activeTab} skills toegevoegd.</div>
        )}

        {!loading && groups.map(({ tag, skills: groupSkills }, groupIdx) => (
          <div key={tag?.id ?? '__ungrouped'} style={{ marginTop: groupIdx > 0 ? '8px' : '0' }}>
            {tag ? (
              <div className="tag-group-label">{tag.naam}</div>
            ) : (
              /* Ungrouped: alleen ruimte als er al andere groepen waren */
              groups.some(g => g.tag !== null) && (
                <div className="tag-group-label" style={{ color: '#444c56' }}>Overig</div>
              )
            )}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {groupSkills.map((skill, i) => (
                <div key={skill.id} style={{ animationDelay: `${i * 0.04}s` }}>
                  <SkillCard skill={skill} accent={accent} onDelete={skillVerwijderen} onEdit={setEditSkill} onTogglePortfolio={togglePortfolioSkill} activeLeerdoelen={activeLeerdoelen} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editSkill && (
        <EditModal
          skill={editSkill}
          allTags={allTags}
          onClose={() => setEditSkill(null)}
          onSave={fetchSkills}
          onTagCreated={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.naam.localeCompare(b.naam)))}
          onTagDeleted={handleTagDeleted}
        />
      )}
    </>
  )
}
