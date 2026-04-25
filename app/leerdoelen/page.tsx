'use client'

import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../../lib/supabase'
import TagSelector, { Tag } from '../components/TagSelector'

type Leerdoel = {
  id: string
  titel: string
  omschrijving: string | null
  type: string
  skill_id: string | null
  thema: string | null
  status: string
  prioriteit: string
  fase: string
  startdatum: string
  doeldatum: string
  voortgang: number
  voortgang_override: boolean
  notities: string | null
  reflectie: string | null
  resources: { label: string; url: string }[]
  aangemaakt_op: string
  tags: Tag[]
}

type Subtaak = {
  id: string
  leerdoel_id: string
  titel: string
  voltooid: boolean
  deadline: string | null
  volgorde: number
}

type Skill = { id: string; naam: string; tags: Tag[] }

const TYPES = ['Certificaat behalen', 'Skill level verhogen', 'Kennis opdoen', 'Projectervaring opdoen', 'Gedragsontwikkeling']
const STATUSSEN = ['Niet gestart', 'Bezig', 'Afgerond', 'Gestopt']
const PRIORITEITEN = ['Low', 'Medium', 'High']
const FASES = ['Now', 'Next', 'Later']

const FASE_COLORS: Record<string, string> = { Now: '#3fb950', Next: '#58a6ff', Later: '#7d8590' }
const PRIO_COLORS: Record<string, string> = { High: '#f85149', Medium: '#d29922', Low: '#3fb950' }
const STATUS_COLORS: Record<string, string> = { 'Niet gestart': '#7d8590', Bezig: '#58a6ff', Afgerond: '#3fb950', Gestopt: '#f85149' }

function groupByTag(leerdoelen: Leerdoel[]): { tag: Tag | null; items: Leerdoel[] }[] {
  const groups: Map<string, { tag: Tag; items: Leerdoel[] }> = new Map()
  const ungrouped: Leerdoel[] = []

  for (const ld of leerdoelen) {
    if (ld.tags.length === 0) {
      ungrouped.push(ld)
    } else {
      const tag = ld.tags[0]
      if (!groups.has(tag.id)) groups.set(tag.id, { tag, items: [] })
      groups.get(tag.id)!.items.push(ld)
    }
  }

  const result: { tag: Tag | null; items: Leerdoel[] }[] = []
  for (const g of groups.values()) result.push(g)
  result.sort((a, b) => a.tag!.naam.localeCompare(b.tag!.naam))
  if (ungrouped.length > 0) result.push({ tag: null, items: ungrouped })
  return result
}

function subtaakDeadlineStatus(deadline: string | null, nowMs: number): 'overdue' | 'urgent' | 'soon' | null {
  if (!deadline) return null
  const days = Math.ceil((new Date(deadline).getTime() - nowMs) / 86400000)
  if (days < 0) return 'overdue'
  if (days === 0) return 'urgent'
  if (days <= 3) return 'soon'
  return null
}

function formatDeadline(date: string) {
  return new Date(date).toLocaleDateString('nl-NL', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function SubtaakDeadlineBadge({ deadline, nowMs }: { deadline: string | null; nowMs: number }) {
  const status = subtaakDeadlineStatus(deadline, nowMs)
  if (!deadline) return null

  const configs = {
    overdue: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
    urgent: { color: '#f85149', bg: 'rgba(248,81,73,0.12)' },
    soon: { color: '#d29922', bg: 'rgba(210,153,34,0.12)' },
    default: { color: '#768390', bg: 'rgba(118,131,144,0.16)' },
  }
  const c = status ? configs[status] : configs.default

  return (
    <span style={{
      fontFamily: "'IBM Plex Mono', monospace",
      fontSize: '9px', fontWeight: 600,
      padding: '2px 6px', borderRadius: '4px',
      background: c.bg, color: c.color,
      flexShrink: 0,
    }}>{formatDeadline(deadline)}</span>
  )
}

export default function LeerdoelenPage() {
  const [leerdoelen, setLeerdoelen] = useState<Leerdoel[]>([])
  const [subtaken, setSubtaken] = useState<Record<string, Subtaak[]>>({})
  const [skills, setSkills] = useState<Skill[]>([])
  const [allTags, setAllTags] = useState<Tag[]>([])
  const [nowMs, setNowMs] = useState(() => Date.now())
  const [loading, setLoading] = useState(true)
  const [activeFase, setActiveFase] = useState<'Now' | 'Next' | 'Later'>('Now')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  // New leerdoel form
  const [form, setForm] = useState({
    titel: '', omschrijving: '', type: TYPES[0], skill_id: '', thema: '',
    status: 'Niet gestart', prioriteit: 'Medium', fase: 'Now',
    startdatum: new Date().toISOString().slice(0, 10), doeldatum: '',
    voortgang: 0, voortgang_override: false,
  })
  const [formTags, setFormTags] = useState<Tag[]>([])
  const [saving, setSaving] = useState(false)

  // Subtaak form
  const [newSubtaak, setNewSubtaak] = useState('')
  const [newSubtaakDeadline, setNewSubtaakDeadline] = useState('')
  const [newResource, setNewResource] = useState({ label: '', url: '' })

  // Detail editing states
  const [editingNotes, setEditingNotes] = useState(false)
  const [editingReflectie, setEditingReflectie] = useState(false)
  const [notitiesVal, setNotitiesVal] = useState('')
  const [reflectieVal, setReflectieVal] = useState('')
  const [editingTags, setEditingTags] = useState(false)
  const [detailTags, setDetailTags] = useState<Tag[]>([])

  // Inline editing for core fields
  const [editingCore, setEditingCore] = useState(false)
  const [coreForm, setCoreForm] = useState({
    titel: '', type: TYPES[0], doeldatum: '', startdatum: '',
    fase: 'Now', prioriteit: 'Medium', skill_id: '',
  })

  function handleTagDeleted(tagId: string) {
    setAllTags(prev => prev.filter(tag => tag.id !== tagId))
    setFormTags(prev => prev.filter(tag => tag.id !== tagId))
    setDetailTags(prev => prev.filter(tag => tag.id !== tagId))
    setLeerdoelen(prev => prev.map(leerdoel => ({
      ...leerdoel,
      tags: leerdoel.tags.filter(tag => tag.id !== tagId),
    })))
    setSkills(prev => prev.map(skill => ({
      ...skill,
      tags: skill.tags.filter(tag => tag.id !== tagId),
    })))
  }

  const fetchAll = useCallback(async () => {
    const [{ data: ld }, { data: sk }, { data: tagsData }] = await Promise.all([
      supabase.from('leerdoelen').select('*, leerdoel_tags(tag_id, tags(id, naam))').order('doeldatum'),
      supabase.from('skills').select('id, naam, skill_tags(tag_id, tags(id, naam))').order('naam'),
      supabase.from('tags').select('*').order('naam'),
    ])
    if (ld) {
      const mapped: Leerdoel[] = ld.map((l: Record<string, unknown>) => ({
        id: l.id as string,
        titel: l.titel as string,
        omschrijving: l.omschrijving as string | null,
        type: l.type as string,
        skill_id: l.skill_id as string | null,
        thema: l.thema as string | null,
        status: l.status as string,
        prioriteit: l.prioriteit as string,
        fase: l.fase as string,
        startdatum: l.startdatum as string,
        doeldatum: l.doeldatum as string,
        voortgang: l.voortgang as number,
        voortgang_override: l.voortgang_override as boolean,
        notities: l.notities as string | null,
        reflectie: l.reflectie as string | null,
        resources: (l.resources as { label: string; url: string }[]) || [],
        aangemaakt_op: l.aangemaakt_op as string,
        tags: ((l.leerdoel_tags as { tag_id: string; tags: Tag }[]) || [])
          .filter((lt) => lt.tags)
          .map((lt) => lt.tags),
      }))
      setLeerdoelen(mapped)
    }
    if (sk) {
      setSkills(sk.map((s: Record<string, unknown>) => ({
        id: s.id as string,
        naam: s.naam as string,
        tags: ((s.skill_tags as { tag_id: string; tags: Tag }[]) || [])
          .filter(st => st.tags).map(st => st.tags),
      })))
    }
    if (tagsData) setAllTags(tagsData)
    setLoading(false)
  }, [])

  const fetchSubtaken = useCallback(async (leerdoelId: string) => {
    const { data } = await supabase.from('leerdoel_subtaken').select('*').eq('leerdoel_id', leerdoelId).order('volgorde')
    if (data) setSubtaken(prev => ({ ...prev, [leerdoelId]: data }))
  }, [])

  useEffect(() => {
    const t = setInterval(() => setNowMs(Date.now()), 60000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const loadAll = async () => {
      await fetchAll()
    }

    void loadAll()
  }, [fetchAll])

  useEffect(() => {
    if (!selectedId) return

    const loadSubtaken = async () => {
      await fetchSubtaken(selectedId)
    }

    void loadSubtaken()
  }, [selectedId, fetchSubtaken])

  const syncVoortgang = useCallback(async (leerdoelId: string, subs: Subtaak[]) => {
    const ld = leerdoelen.find(l => l.id === leerdoelId)
    if (!ld || ld.voortgang_override || subs.length === 0) return
    const pct = Math.round((subs.filter(s => s.voltooid).length / subs.length) * 100)
    const newStatus = pct === 100 ? 'Afgerond' : ld.status === 'Afgerond' ? 'Bezig' : ld.status
    await supabase.from('leerdoelen').update({ voortgang: pct, status: newStatus }).eq('id', leerdoelId)
    setLeerdoelen(prev => prev.map(l => l.id === leerdoelId ? { ...l, voortgang: pct, status: newStatus } : l))
  }, [leerdoelen])

  async function saveLeerdoel() {
    if (!form.titel || !form.doeldatum) return
    setSaving(true)

    // Als skill gekozen is, koppel automatisch de tag van die skill
    let tagsToSave = formTags
    if (form.skill_id) {
      const skill = skills.find(s => s.id === form.skill_id)
      if (skill && skill.tags.length > 0) {
        // Skill's eerste tag prevaleert, voeg toe als niet al aanwezig
        const skillTag = skill.tags[0]
        if (!tagsToSave.some(t => t.id === skillTag.id)) {
          tagsToSave = [skillTag, ...tagsToSave]
        }
      }
    }

    const { data } = await supabase.from('leerdoelen').insert({
      titel: form.titel, omschrijving: form.omschrijving || null, type: form.type,
      skill_id: form.skill_id || null, thema: form.thema || null,
      status: form.status, prioriteit: form.prioriteit, fase: form.fase,
      startdatum: form.startdatum, doeldatum: form.doeldatum, voortgang: 0, voortgang_override: false,
    }).select().single()

    if (data && tagsToSave.length > 0) {
      await supabase.from('leerdoel_tags').insert(tagsToSave.map(t => ({ leerdoel_id: data.id, tag_id: t.id })))
    }
    if (data) setSelectedId(data.id)
    resetForm()
    setSaving(false)
    fetchAll()
  }

  async function deleteLeerdoel(id: string) {
    await supabase.from('leerdoelen').delete().eq('id', id)
    setLeerdoelen(prev => prev.filter(l => l.id !== id))
    if (selectedId === id) setSelectedId(null)
  }

  async function updateField(id: string, updates: Partial<Leerdoel>) {
    const rest = { ...(updates as Partial<Leerdoel> & { tags?: Tag[] }) }
    delete rest.tags
    await supabase.from('leerdoelen').update(rest).eq('id', id)
    setLeerdoelen(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
  }

  async function saveCoreEdits(id: string) {
    const updates = {
      titel: coreForm.titel,
      type: coreForm.type,
      doeldatum: coreForm.doeldatum,
      startdatum: coreForm.startdatum,
      fase: coreForm.fase,
      prioriteit: coreForm.prioriteit,
      skill_id: coreForm.skill_id || null,
    }
    await supabase.from('leerdoelen').update(updates).eq('id', id)

    // Als skill gewisseld is, sync tag
    if (coreForm.skill_id) {
      const skill = skills.find(s => s.id === coreForm.skill_id)
      if (skill && skill.tags.length > 0) {
        const ld = leerdoelen.find(l => l.id === id)
        if (ld) {
          const skillTag = skill.tags[0]
          if (!ld.tags.some(t => t.id === skillTag.id)) {
            const newTags = [skillTag, ...ld.tags]
            await supabase.from('leerdoel_tags').delete().eq('leerdoel_id', id)
            await supabase.from('leerdoel_tags').insert(newTags.map(t => ({ leerdoel_id: id, tag_id: t.id })))
            setLeerdoelen(prev => prev.map(l => l.id === id ? { ...l, ...updates, tags: newTags } : l))
            setEditingCore(false)
            fetchAll()
            return
          }
        }
      }
    }

    setLeerdoelen(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l))
    setEditingCore(false)
  }

  async function saveDetailTags(id: string, tags: Tag[]) {
    await supabase.from('leerdoel_tags').delete().eq('leerdoel_id', id)
    if (tags.length > 0) {
      await supabase.from('leerdoel_tags').insert(tags.map(t => ({ leerdoel_id: id, tag_id: t.id })))
    }
    setLeerdoelen(prev => prev.map(l => l.id === id ? { ...l, tags } : l))
    setEditingTags(false)
  }

  function resetForm() {
    setForm({ titel: '', omschrijving: '', type: TYPES[0], skill_id: '', thema: '', status: 'Niet gestart', prioriteit: 'Medium', fase: 'Now', startdatum: new Date().toISOString().slice(0, 10), doeldatum: '', voortgang: 0, voortgang_override: false })
    setFormTags([])
    setShowForm(false)
  }

  async function addSubtaak(leerdoelId: string) {
    if (!newSubtaak.trim()) return
    const subs = subtaken[leerdoelId] || []
    const { data } = await supabase.from('leerdoel_subtaken').insert({
      leerdoel_id: leerdoelId,
      titel: newSubtaak.trim(),
      voltooid: false,
      deadline: newSubtaakDeadline || null,
      volgorde: subs.length,
    }).select().single()
    if (data) {
      const updated = [...subs, data]
      setSubtaken(prev => ({ ...prev, [leerdoelId]: updated }))
      await syncVoortgang(leerdoelId, updated)
    }
    setNewSubtaak('')
    setNewSubtaakDeadline('')
  }

  async function toggleSubtaak(leerdoelId: string, subtaakId: string, voltooid: boolean) {
    await supabase.from('leerdoel_subtaken').update({ voltooid }).eq('id', subtaakId)
    const updated = (subtaken[leerdoelId] || []).map(s => s.id === subtaakId ? { ...s, voltooid } : s)
    setSubtaken(prev => ({ ...prev, [leerdoelId]: updated }))
    await syncVoortgang(leerdoelId, updated)
  }

  async function deleteSubtaak(leerdoelId: string, subtaakId: string) {
    await supabase.from('leerdoel_subtaken').delete().eq('id', subtaakId)
    const updated = (subtaken[leerdoelId] || []).filter(s => s.id !== subtaakId)
    setSubtaken(prev => ({ ...prev, [leerdoelId]: updated }))
    await syncVoortgang(leerdoelId, updated)
  }

  async function addResource(ld: Leerdoel) {
    if (!newResource.url) return
    const resources = [...(ld.resources || []), newResource]
    await supabase.from('leerdoelen').update({ resources }).eq('id', ld.id)
    setLeerdoelen(prev => prev.map(l => l.id === ld.id ? { ...l, resources } : l))
    setNewResource({ label: '', url: '' })
  }

  async function removeResource(ld: Leerdoel, idx: number) {
    const resources = (ld.resources || []).filter((_, i) => i !== idx)
    await supabase.from('leerdoelen').update({ resources }).eq('id', ld.id)
    setLeerdoelen(prev => prev.map(l => l.id === ld.id ? { ...l, resources } : l))
  }

  // Als skill gekozen wordt in het formulier, sync automatisch de tag
  function handleFormSkillChange(skillId: string) {
    setForm(f => ({ ...f, skill_id: skillId }))
    if (skillId) {
      const skill = skills.find(s => s.id === skillId)
      if (skill && skill.tags.length > 0) {
        const skillTag = skill.tags[0]
        setFormTags(prev => prev.some(t => t.id === skillTag.id) ? prev : [skillTag, ...prev])
      }
    }
  }

  // Als tag gekozen wordt in het formulier, filter beschikbare skills
  const skillsForFormTag = formTags.length > 0
    ? skills.filter(s => s.tags.some(t => formTags.some(ft => ft.id === t.id)))
    : skills

  const byFase = (fase: string) => leerdoelen
    .filter(l => l.fase === fase)
    .sort((a, b) => {
      const pd = new Date(a.doeldatum).getTime() - new Date(b.doeldatum).getTime()
      const pp = PRIORITEITEN.indexOf(b.prioriteit) - PRIORITEITEN.indexOf(a.prioriteit)
      return pd || pp
    })

  const selected = leerdoelen.find(l => l.id === selectedId) || null
  const isOverdue = (ld: Leerdoel) => ld.status !== 'Afgerond' && ld.status !== 'Gestopt' && new Date(ld.doeldatum).getTime() < nowMs

  // Skills gefilterd op tag van geselecteerd leerdoel (voor core edit)
  const skillsForCoreEdit = selected
    ? (selected.tags.length > 0
        ? skills.filter(s => s.tags.some(t => selected.tags.some(st => st.id === t.id)))
        : skills)
    : skills

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@300;400;500;600&display=swap');

        .ld {
          --bg: #0d1117; --surface: #161b22; --surface2: #1c2330;
          --border: #2d333b; --border-hover: #444c56;
          --accent: #58a6ff; --accent-dim: rgba(88,166,255,0.08); --accent-border: rgba(88,166,255,0.25);
          --text: #cdd9e5; --text-sub: #768390; --text-dim: #444c56;
          --danger: #e05252; --success: #3fb950;
          font-family: 'IBM Plex Sans', sans-serif; color: var(--text);
        }
        .ld * { box-sizing: border-box; }

        .ld-layout { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; min-height: 600px; }
        @media (max-width: 680px) { .ld-layout { grid-template-columns: 1fr; } }

        .fase-tabs { display: flex; gap: 4px; background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 4px; margin-bottom: 16px; }
        .fase-tab { flex: 1; padding: 8px 0; border-radius: 7px; border: none; background: transparent; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 500; cursor: pointer; transition: all 0.15s; color: var(--text-sub); display: flex; align-items: center; justify-content: center; gap: 6px; }
        .fase-tab.active { background: var(--accent); color: #0d1117; font-weight: 600; }
        .fase-tab:not(.active):hover { background: var(--surface2); color: var(--text); }
        .fase-count { font-family: 'IBM Plex Mono', monospace; font-size: 10px; background: rgba(0,0,0,0.3); border-radius: 4px; padding: 1px 5px; }
        .fase-tab.active .fase-count { background: rgba(0,0,0,0.2); }

        .tag-group-label {
          font-family: 'IBM Plex Mono', monospace;
          font-size: 9px;
          letter-spacing: 1.2px;
          text-transform: uppercase;
          color: #768390;
          padding: 14px 0 6px;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .tag-group-label::after { content: ''; flex: 1; height: 1px; background: #1c2330; }

        .ld-card { background: var(--surface); border: 1px solid var(--border); border-radius: 8px; padding: 12px 14px; cursor: pointer; transition: border-color 0.15s, background 0.15s; animation: fadeSlide 0.2s ease both; position: relative; }
        .ld-card:hover { border-color: var(--border-hover); }
        .ld-card.selected { border-color: var(--accent-border); background: rgba(88,166,255,0.04); }
        .ld-card.overdue { border-left: 3px solid #f85149; }

        .card-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
        .card-titel { font-size: 13px; font-weight: 600; color: var(--text); line-height: 1.35; }
        .card-badges { display: flex; gap: 4px; flex-shrink: 0; }
        .badge { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 600; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 4px; text-transform: uppercase; }

        .progress-bar-wrap { height: 3px; background: var(--surface2); border-radius: 2px; margin-bottom: 8px; overflow: hidden; }
        .progress-bar-fill { height: 100%; border-radius: 2px; transition: width 0.3s ease; }

        .card-meta { display: flex; align-items: center; gap: 8px; font-family: 'IBM Plex Mono', monospace; font-size: 10px; color: var(--text-sub); }

        .detail-panel { background: var(--surface); border: 1px solid var(--border); border-radius: 10px; padding: 20px; position: sticky; top: 80px; max-height: calc(100vh - 100px); overflow-y: auto; animation: fadeSlide 0.2s ease; }
        .detail-panel::-webkit-scrollbar { width: 3px; }
        .detail-panel::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }

        .detail-empty { display: flex; align-items: center; justify-content: center; height: 200px; color: var(--text-sub); font-size: 13px; border: 1px solid var(--border); border-radius: 10px; border-style: dashed; }

        .section-label { font-family: 'IBM Plex Mono', monospace; font-size: 10px; letter-spacing: 0.8px; text-transform: uppercase; color: var(--text-sub); margin-bottom: 10px; margin-top: 20px; }
        .section-label:first-child { margin-top: 0; }

        .progress-big-wrap { height: 6px; background: var(--surface2); border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
        .progress-big-fill { height: 100%; border-radius: 4px; transition: width 0.4s ease; }
        .progress-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
        .progress-pct { font-family: 'IBM Plex Mono', monospace; font-size: 20px; font-weight: 600; color: var(--accent); }

        .subtaak-row { display: flex; align-items: center; gap: 8px; padding: 7px 0; border-bottom: 1px solid var(--border); animation: fadeSlide 0.15s ease; }
        .subtaak-row:last-child { border-bottom: none; }
        .subtaak-check { width: 16px; height: 16px; border-radius: 4px; border: 1px solid var(--border); cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0; transition: all 0.15s; background: transparent; }
        .subtaak-check.done { background: var(--success); border-color: var(--success); }
        .subtaak-check.done::after { content: '✓'; font-size: 10px; color: #0d1117; font-weight: 700; }
        .subtaak-titel { flex: 1; font-size: 13px; color: var(--text); transition: color 0.15s; }
        .subtaak-titel.done { color: var(--text-sub); text-decoration: line-through; }

        .form-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 10px; padding: 20px; margin-bottom: 20px; animation: fadeSlide 0.2s ease; }
        .form-grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
        .form-field { display: flex; flex-direction: column; gap: 4px; }
        .form-label { font-size: 11px; color: var(--text-sub); font-weight: 500; }
        .form-input { background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 8px 10px; color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; outline: none; width: 100%; transition: border-color 0.15s; }
        .form-input:focus { border-color: var(--accent); }
        .form-input option { background: #1c2330; }

        .chip-row { display: flex; gap: 5px; flex-wrap: wrap; }
        .chip { padding: 6px 12px; border-radius: 6px; border: 1px solid var(--border); background: transparent; color: var(--text-sub); font-family: 'IBM Plex Sans', sans-serif; font-size: 12px; cursor: pointer; transition: all 0.15s; }
        .chip.active { border-color: var(--accent-border); background: var(--accent-dim); color: var(--accent); font-weight: 500; }

        .btn { border: none; border-radius: 7px; padding: 8px 16px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .btn-primary { background: var(--accent); color: #0d1117; }
        .btn-primary:hover { opacity: 0.85; }
        .btn-primary:disabled { opacity: 0.35; cursor: default; }
        .btn-ghost { background: transparent; border: 1px solid var(--border); color: var(--text-sub); }
        .btn-ghost:hover { border-color: var(--border-hover); color: var(--text); }
        .btn-sm { padding: 5px 10px; font-size: 11px; }
        .btn-danger { background: rgba(232,82,82,0.1); color: var(--danger); border: 1px solid transparent; }
        .btn-danger:hover { border-color: var(--danger); }

        .inline-add { display: flex; gap: 6px; margin-top: 8px; }
        .inline-add .form-input { flex: 1; }

        .status-select { font-family: 'IBM Plex Sans', sans-serif; font-size: 11px; font-weight: 600; border-radius: 5px; border: 1px solid var(--border); padding: 3px 8px; cursor: pointer; outline: none; background: var(--surface2); }

        .meta-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; border-bottom: 1px solid var(--border); font-size: 12px; }
        .meta-row:last-child { border-bottom: none; }
        .meta-key { color: var(--text-sub); }
        .meta-val { color: var(--text); font-weight: 500; }

        .notes-area { background: var(--bg); border: 1px solid var(--border); border-radius: 7px; padding: 10px; color: var(--text); font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; outline: none; width: 100%; resize: vertical; min-height: 80px; transition: border-color 0.15s; line-height: 1.6; }
        .notes-area:focus { border-color: var(--accent); }
        .notes-display { font-size: 13px; color: var(--text-sub); line-height: 1.6; white-space: pre-wrap; cursor: pointer; padding: 8px; border-radius: 6px; border: 1px solid transparent; transition: border-color 0.15s; }
        .notes-display:hover { border-color: var(--border); color: var(--text); }
        .notes-placeholder { color: var(--text-dim); font-style: italic; }

        .resource-row { display: flex; align-items: center; gap: 6px; padding: 5px 0; font-size: 12px; }
        .resource-link { color: var(--accent); text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .resource-link:hover { text-decoration: underline; }

        .overdue-badge { font-family: 'IBM Plex Mono', monospace; font-size: 9px; font-weight: 700; letter-spacing: 0.5px; padding: 2px 6px; border-radius: 4px; background: rgba(248,81,73,0.15); color: #f85149; text-transform: uppercase; }

        .edit-btn { background: transparent; border: 1px solid var(--border); border-radius: 6px; padding: 4px 10px; font-family: 'IBM Plex Sans', sans-serif; font-size: 11px; color: var(--text-sub); cursor: pointer; transition: all 0.15s; }
        .edit-btn:hover { border-color: var(--accent-border); color: var(--accent); }

        .core-edit-box { background: var(--surface2); border: 1px solid var(--border); border-radius: 8px; padding: 14px; margin-bottom: 4px; }

        @keyframes fadeSlide { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }

        .add-btn { background: var(--accent); color: #0d1117; border: none; border-radius: 7px; padding: 9px 18px; font-family: 'IBM Plex Sans', sans-serif; font-size: 13px; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
        .add-btn:hover { opacity: 0.85; }
        .add-btn.cancel { background: transparent; border: 1px solid var(--border); color: var(--text-sub); }
        .add-btn.cancel:hover { border-color: var(--border-hover); color: var(--text); }
      `}</style>

      <div className="ld">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 style={{ fontFamily: "'IBM Plex Sans', sans-serif", fontSize: '22px', fontWeight: 600, letterSpacing: '-0.3px' }}>Leerdoelen</h1>
          <div style={{ display: 'flex', gap: '8px' }}>
            {showForm
              ? <button className="add-btn cancel" onClick={() => setShowForm(false)}>Annuleren</button>
              : <button className="add-btn" onClick={() => setShowForm(true)}>+ Toevoegen</button>}
          </div>
        </div>

        {/* Formulier */}
        {showForm && (
          <div className="form-box">
            <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', letterSpacing: '0.8px', textTransform: 'uppercase', color: 'var(--text-sub)', marginBottom: '16px' }}>Nieuw leerdoel</div>

            <div className="form-grid-2">
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Titel *</label>
                <input className="form-input" value={form.titel} onChange={e => setForm(f => ({ ...f, titel: e.target.value }))} placeholder="bijv. CDMP Associate behalen" />
              </div>
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Omschrijving</label>
                <textarea className="form-input" value={form.omschrijving} onChange={e => setForm(f => ({ ...f, omschrijving: e.target.value }))} rows={2} style={{ resize: 'none' }} />
              </div>

              {/* Tag eerst, dan skill gefilterd op tag */}
              <div className="form-field" style={{ gridColumn: '1 / -1' }}>
                <label className="form-label">Tag</label>
                <TagSelector
                  selectedTags={formTags}
                  onChange={tags => {
                    setFormTags(tags)
                    // Als tag verandert en skill past niet meer, reset skill
                    if (form.skill_id) {
                      const skill = skills.find(s => s.id === form.skill_id)
                      if (skill && tags.length > 0 && !skill.tags.some(st => tags.some(t => t.id === st.id))) {
                        setForm(f => ({ ...f, skill_id: '' }))
                      }
                    }
                  }}
                  allTags={allTags}
                  onTagCreated={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.naam.localeCompare(b.naam)))}
                  onTagDeleted={handleTagDeleted}
                />
              </div>
              <div className="form-field">
                <label className="form-label">Koppel skill {formTags.length > 0 && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(gefilterd op tag)</span>}</label>
                <select className="form-input" value={form.skill_id} onChange={e => handleFormSkillChange(e.target.value)}>
                  <option value="">— Geen —</option>
                  {skillsForFormTag.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
                </select>
              </div>
            </div>

            <div className="form-field" style={{ marginBottom: '12px' }}>
              <label className="form-label">Type</label>
              <div className="chip-row">
                {TYPES.map(t => (
                  <button key={t} className={`chip ${form.type === t ? 'active' : ''}`} onClick={() => setForm(f => ({ ...f, type: t }))}>{t}</button>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '12px' }}>
              <div className="form-field">
                <label className="form-label">Fase</label>
                <div className="chip-row">
                  {FASES.map(f2 => (
                    <button key={f2} className={`chip ${form.fase === f2 ? 'active' : ''}`}
                      style={form.fase === f2 ? { borderColor: FASE_COLORS[f2], color: FASE_COLORS[f2], background: `${FASE_COLORS[f2]}15` } : {}}
                      onClick={() => setForm(f => ({ ...f, fase: f2 }))}>{f2}</button>
                  ))}
                </div>
              </div>
              <div className="form-field">
                <label className="form-label">Prioriteit</label>
                <div className="chip-row">
                  {PRIORITEITEN.map(p => (
                    <button key={p} className={`chip ${form.prioriteit === p ? 'active' : ''}`}
                      style={form.prioriteit === p ? { borderColor: PRIO_COLORS[p], color: PRIO_COLORS[p], background: `${PRIO_COLORS[p]}15` } : {}}
                      onClick={() => setForm(f => ({ ...f, prioriteit: p }))}>{p}</button>
                  ))}
                </div>
              </div>
            </div>

            <div className="form-grid-2" style={{ marginBottom: '12px' }}>
              <div className="form-field">
                <label className="form-label">Startdatum *</label>
                <input className="form-input" type="date" value={form.startdatum} onChange={e => setForm(f => ({ ...f, startdatum: e.target.value }))} />
              </div>
              <div className="form-field">
                <label className="form-label">Doeldatum *</label>
                <input className="form-input" type="date" value={form.doeldatum} onChange={e => setForm(f => ({ ...f, doeldatum: e.target.value }))} />
              </div>
            </div>

            <button className="btn btn-primary" onClick={saveLeerdoel} disabled={saving || !form.titel || !form.doeldatum}>
              {saving ? 'Opslaan...' : 'Opslaan'}
            </button>
          </div>
        )}

        {/* Main layout */}
        <div className="ld-layout">

          {/* Lijst */}
          <div>
            <div className="fase-tabs">
              {FASES.map(f2 => (
                <button key={f2} className={`fase-tab ${activeFase === f2 ? 'active' : ''}`} onClick={() => setActiveFase(f2 as 'Now' | 'Next' | 'Later')}>
                  <span style={{ color: activeFase === f2 ? '#0d1117' : FASE_COLORS[f2] }}>●</span>
                  {f2}
                  <span className="fase-count">{byFase(f2).length}</span>
                </button>
              ))}
            </div>

            {loading && <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)', fontSize: '13px' }}>Laden...</div>}
            {!loading && byFase(activeFase).length === 0 && (
              <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-sub)', fontSize: '13px' }}>Geen leerdoelen in {activeFase}.</div>
            )}

            {!loading && groupByTag(byFase(activeFase)).map(({ tag, items }) => (
              <div key={tag?.id ?? '__ungrouped'}>
                {tag && <div className="tag-group-label">{tag.naam}</div>}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {items.map((ld, i) => {
                    const overdue = isOverdue(ld)
                    const deadlineDiffDays = Math.ceil((new Date(ld.doeldatum).getTime() - nowMs) / 86400000)
                    const skillNaam = skills.find(s => s.id === ld.skill_id)?.naam

                    return (
                      <div key={ld.id} className={`ld-card ${selectedId === ld.id ? 'selected' : ''} ${overdue ? 'overdue' : ''}`}
                        style={{ animationDelay: `${i * 0.04}s` }}
                        onClick={() => {
                          setSelectedId(ld.id)
                          setNotitiesVal(ld.notities || '')
                          setReflectieVal(ld.reflectie || '')
                          setDetailTags(ld.tags)
                          setEditingNotes(false)
                          setEditingReflectie(false)
                          setEditingTags(false)
                          setEditingCore(false)
                        }}>
                        <div className="card-top">
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="card-titel">{ld.titel}</div>
                            {skillNaam && (
                              <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>↳ {skillNaam}</div>
                            )}
                          </div>
                          <div className="card-badges">
                            {overdue && <span className="overdue-badge">Overdue</span>}
                            <span className="badge" style={{ background: `${PRIO_COLORS[ld.prioriteit]}15`, color: PRIO_COLORS[ld.prioriteit] }}>{ld.prioriteit}</span>
                            <span className="badge" style={{ background: `${STATUS_COLORS[ld.status]}15`, color: STATUS_COLORS[ld.status] }}>
                              {ld.status === 'Niet gestart' ? 'To Start' : ld.status === 'Afgerond' ? 'Done' : ld.status}
                            </span>
                          </div>
                        </div>

                        <div className="progress-bar-wrap">
                          <div className="progress-bar-fill" style={{ width: `${ld.voortgang}%`, background: ld.voortgang === 100 ? 'var(--success)' : 'var(--accent)' }} />
                        </div>

                        <div className="card-meta">
                          <span style={{ fontFamily: "'IBM Plex Mono', monospace", color: ld.voortgang >= 100 ? 'var(--success)' : 'var(--accent)' }}>{ld.voortgang}%</span>
                          <span style={{ flex: 1 }} />
                          <span style={{ color: overdue ? '#f85149' : deadlineDiffDays <= 7 ? '#d29922' : 'var(--text-sub)' }}>
                            {formatDeadline(ld.doeldatum)}
                          </span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Detail panel */}
          <div>
            {!selected ? (
              <div className="detail-empty">Selecteer een leerdoel</div>
            ) : (
              <div className="detail-panel">

                {/* Header + edit toggle */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px', marginBottom: '4px' }}>
                  <div style={{ flex: 1 }}>
                    {!editingCore ? (
                      <>
                        <div style={{ fontSize: '16px', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{selected.titel}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-sub)', marginTop: '2px' }}>{selected.type}</div>
                      </>
                    ) : null}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    {!editingCore && (
                      <button className="edit-btn" onClick={() => {
                        setCoreForm({
                          titel: selected.titel,
                          type: selected.type,
                          doeldatum: selected.doeldatum,
                          startdatum: selected.startdatum,
                          fase: selected.fase,
                          prioriteit: selected.prioriteit,
                          skill_id: selected.skill_id || '',
                        })
                        setEditingCore(true)
                      }}>✏️ Bewerken</button>
                    )}
                    <button className="btn btn-danger btn-sm" onClick={() => deleteLeerdoel(selected.id)}>Verwijderen</button>
                  </div>
                </div>

                {/* Core edit form */}
                {editingCore && (
                  <div className="core-edit-box">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <div className="form-field">
                        <label className="form-label">Titel</label>
                        <input className="form-input" value={coreForm.titel} onChange={e => setCoreForm(f => ({ ...f, titel: e.target.value }))} />
                      </div>
                      <div className="form-field">
                        <label className="form-label">Type</label>
                        <select className="form-input" value={coreForm.type} onChange={e => setCoreForm(f => ({ ...f, type: e.target.value }))}>
                          {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-field">
                          <label className="form-label">Startdatum</label>
                          <input className="form-input" type="date" value={coreForm.startdatum} onChange={e => setCoreForm(f => ({ ...f, startdatum: e.target.value }))} />
                        </div>
                        <div className="form-field">
                          <label className="form-label">Doeldatum</label>
                          <input className="form-input" type="date" value={coreForm.doeldatum} onChange={e => setCoreForm(f => ({ ...f, doeldatum: e.target.value }))} />
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        <div className="form-field">
                          <label className="form-label">Fase</label>
                          <select className="form-input" value={coreForm.fase} onChange={e => setCoreForm(f => ({ ...f, fase: e.target.value }))}
                            style={{ color: FASE_COLORS[coreForm.fase] }}>
                            {FASES.map(f2 => <option key={f2} value={f2}>{f2}</option>)}
                          </select>
                        </div>
                        <div className="form-field">
                          <label className="form-label">Prioriteit</label>
                          <select className="form-input" value={coreForm.prioriteit} onChange={e => setCoreForm(f => ({ ...f, prioriteit: e.target.value }))}
                            style={{ color: PRIO_COLORS[coreForm.prioriteit] }}>
                            {PRIORITEITEN.map(p => <option key={p} value={p}>{p}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="form-field">
                        <label className="form-label">Skill {selected.tags.length > 0 && <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}>(gefilterd op tag)</span>}</label>
                        <select className="form-input" value={coreForm.skill_id} onChange={e => setCoreForm(f => ({ ...f, skill_id: e.target.value }))}>
                          <option value="">— Geen —</option>
                          {skillsForCoreEdit.map(s => <option key={s.id} value={s.id}>{s.naam}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button className="btn btn-primary btn-sm" onClick={() => saveCoreEdits(selected.id)}>Opslaan</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => setEditingCore(false)}>Annuleren</button>
                      </div>
                    </div>
                  </div>
                )}

                {selected.omschrijving && !editingCore && (
                  <p style={{ fontSize: '12px', color: 'var(--text-sub)', lineHeight: 1.6, marginBottom: '12px' }}>{selected.omschrijving}</p>
                )}

                {/* Tags */}
                <div className="section-label">Tags</div>
                {editingTags ? (
                  <div style={{ marginBottom: '8px' }}>
                <TagSelector
                  selectedTags={detailTags}
                  onChange={setDetailTags}
                  allTags={allTags}
                  onTagCreated={tag => setAllTags(prev => [...prev, tag].sort((a, b) => a.naam.localeCompare(b.naam)))}
                  onTagDeleted={handleTagDeleted}
                />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => saveDetailTags(selected.id, detailTags)}>Opslaan</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingTags(false)}>Annuleren</button>
                    </div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap', marginBottom: '4px', cursor: 'pointer', padding: '4px', borderRadius: '6px', border: '1px solid transparent', transition: 'border-color 0.15s' }}
                    onClick={() => { setDetailTags(selected.tags); setEditingTags(true) }}
                    onMouseEnter={e => e.currentTarget.style.borderColor = '#2d333b'}
                    onMouseLeave={e => e.currentTarget.style.borderColor = 'transparent'}>
                    {selected.tags.length === 0
                      ? <span style={{ fontSize: '12px', color: 'var(--text-dim)', fontStyle: 'italic' }}>Klik om tags toe te voegen...</span>
                      : selected.tags.map(tag => (
                        <span key={tag.id} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', background: 'rgba(88,166,255,0.12)', border: '1px solid rgba(88,166,255,0.25)', borderRadius: '5px', padding: '2px 8px', fontFamily: "'IBM Plex Mono', monospace", fontSize: '11px', color: '#58a6ff' }}>
                          {tag.naam}
                        </span>
                      ))
                    }
                  </div>
                )}

                {/* Voortgang */}
                <div className="section-label">Voortgang</div>
                <div className="progress-row">
                  <span className="progress-pct">{selected.voortgang}%</span>
                  {selected.voortgang_override && <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: '10px', color: 'var(--text-sub)', border: '1px solid var(--border)', borderRadius: '4px', padding: '1px 5px' }}>manual</span>}
                </div>
                <div className="progress-big-wrap">
                  <div className="progress-big-fill" style={{ width: `${selected.voortgang}%`, background: selected.voortgang === 100 ? 'var(--success)' : 'var(--accent)' }} />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px', marginTop: '8px' }}>
                  <input type="checkbox" id="override" checked={selected.voortgang_override}
                    onChange={e => updateField(selected.id, { voortgang_override: e.target.checked })}
                    style={{ accentColor: 'var(--accent)' }} />
                  <label htmlFor="override" style={{ fontSize: '11px', color: 'var(--text-sub)', cursor: 'pointer' }}>Handmatige override</label>
                </div>
                {selected.voortgang_override && (
                  <input type="range" min={0} max={100} step={5} value={selected.voortgang}
                    onChange={e => {
                      const v = Number(e.target.value)
                      updateField(selected.id, { voortgang: v, status: v === 100 ? 'Afgerond' : selected.status })
                    }}
                    style={{ width: '100%', accentColor: 'var(--accent)', marginBottom: '8px' }} />
                )}

                {/* Status (quick edit, altijd zichtbaar) */}
                <div className="section-label">Status</div>
                <div style={{ background: 'var(--surface2)', borderRadius: '8px', padding: '2px 10px', marginBottom: '4px' }}>
                  <div className="meta-row">
                    <span className="meta-key">Status</span>
                    <select className="status-select" value={selected.status} style={{ color: STATUS_COLORS[selected.status] }}
                      onChange={e => updateField(selected.id, { status: e.target.value })}>
                      {STATUSSEN.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                  {!editingCore && (
                    <>
                      <div className="meta-row">
                        <span className="meta-key">Fase</span>
                        <span className="meta-val" style={{ color: FASE_COLORS[selected.fase] }}>{selected.fase}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-key">Prioriteit</span>
                        <span className="meta-val" style={{ color: PRIO_COLORS[selected.prioriteit] }}>{selected.prioriteit}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-key">Doeldatum</span>
                        <span className="meta-val">{formatDeadline(selected.doeldatum)}</span>
                      </div>
                      <div className="meta-row">
                        <span className="meta-key">Skill</span>
                        <span className="meta-val">{skills.find(s => s.id === selected.skill_id)?.naam || '—'}</span>
                      </div>
                    </>
                  )}
                </div>

                {/* Subtaken */}
                <div className="section-label">Subtaken</div>
                <div>
                  {(subtaken[selected.id] || []).map(sub => {
                    const dlStatus = subtaakDeadlineStatus(sub.deadline, nowMs)
                    return (
                      <div key={sub.id} className="subtaak-row"
                        style={dlStatus === 'overdue' ? { background: 'rgba(248,81,73,0.04)' } : dlStatus === 'urgent' ? { background: 'rgba(248,81,73,0.04)' } : {}}>
                        <div className={`subtaak-check ${sub.voltooid ? 'done' : ''}`} onClick={() => toggleSubtaak(selected.id, sub.id, !sub.voltooid)} />
                        <span className={`subtaak-titel ${sub.voltooid ? 'done' : ''}`}>{sub.titel}</span>
                        {!sub.voltooid && <SubtaakDeadlineBadge deadline={sub.deadline} nowMs={nowMs} />}
                        <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px', fontSize: '11px' }} onClick={() => deleteSubtaak(selected.id, sub.id)}>×</button>
                      </div>
                    )
                  })}
                </div>

                {/* Subtaak toevoegen met deadline */}
                <div style={{ marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className="form-input" placeholder="Nieuwe subtaak..." value={newSubtaak} onChange={e => setNewSubtaak(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && addSubtaak(selected.id)} style={{ flex: 1 }} />
                    <button className="btn btn-primary btn-sm" onClick={() => addSubtaak(selected.id)}>+</button>
                  </div>
                  <input
                    className="form-input"
                    type="date"
                    value={newSubtaakDeadline}
                    onChange={e => setNewSubtaakDeadline(e.target.value)}
                    style={{ fontSize: '11px', padding: '5px 8px', color: newSubtaakDeadline ? 'var(--text)' : 'var(--text-dim)' }}
                    title="Deadline subtaak (optioneel)"
                  />
                </div>

                {/* Notities */}
                <div className="section-label">Notities</div>
                {editingNotes ? (
                  <div>
                    <textarea className="notes-area" value={notitiesVal} onChange={e => setNotitiesVal(e.target.value)} />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => { updateField(selected.id, { notities: notitiesVal }); setEditingNotes(false) }}>Opslaan</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingNotes(false)}>Annuleren</button>
                    </div>
                  </div>
                ) : (
                  <div className="notes-display" onClick={() => { setNotitiesVal(selected.notities || ''); setEditingNotes(true) }}>
                    {selected.notities || <span className="notes-placeholder">Klik om notities toe te voegen...</span>}
                  </div>
                )}

                {/* Reflectie */}
                <div className="section-label">Reflectie</div>
                {editingReflectie ? (
                  <div>
                    <textarea className="notes-area" value={reflectieVal} onChange={e => setReflectieVal(e.target.value)} />
                    <div style={{ display: 'flex', gap: '6px', marginTop: '6px' }}>
                      <button className="btn btn-primary btn-sm" onClick={() => { updateField(selected.id, { reflectie: reflectieVal }); setEditingReflectie(false) }}>Opslaan</button>
                      <button className="btn btn-ghost btn-sm" onClick={() => setEditingReflectie(false)}>Annuleren</button>
                    </div>
                  </div>
                ) : (
                  <div className="notes-display" onClick={() => { setReflectieVal(selected.reflectie || ''); setEditingReflectie(true) }}>
                    {selected.reflectie || <span className="notes-placeholder">Klik om reflectie toe te voegen...</span>}
                  </div>
                )}

                {/* Resources */}
                <div className="section-label">Resources</div>
                {(selected.resources || []).map((r, i) => (
                  <div key={i} className="resource-row">
                    <span>🔗</span>
                    <a href={r.url} target="_blank" rel="noopener noreferrer" className="resource-link">{r.label || r.url}</a>
                    <button className="btn btn-danger btn-sm" style={{ padding: '2px 6px' }} onClick={() => removeResource(selected, i)}>×</button>
                  </div>
                ))}
                <div className="inline-add" style={{ flexDirection: 'column', gap: '4px' }}>
                  <input className="form-input" placeholder="Label (optioneel)" value={newResource.label} onChange={e => setNewResource(r => ({ ...r, label: e.target.value }))} />
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <input className="form-input" placeholder="URL" value={newResource.url} onChange={e => setNewResource(r => ({ ...r, url: e.target.value }))} onKeyDown={e => e.key === 'Enter' && addResource(selected)} />
                    <button className="btn btn-primary btn-sm" onClick={() => addResource(selected)}>+</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
