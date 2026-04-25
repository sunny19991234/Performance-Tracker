'use client'

import { useState, useRef, useEffect } from 'react'
import { supabase } from '../../lib/supabase'

export type Tag = { id: string; naam: string }

interface TagSelectorProps {
  selectedTags: Tag[]
  onChange: (tags: Tag[]) => void
  allTags: Tag[]
  onTagCreated: (tag: Tag) => void
  onTagDeleted?: (tagId: string) => void
}

export default function TagSelector({
  selectedTags,
  onChange,
  allTags,
  onTagCreated,
  onTagDeleted,
}: TagSelectorProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [creating, setCreating] = useState(false)
  const [deletingTagId, setDeletingTagId] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus()
  }, [open])

  const filtered = allTags.filter(t =>
    t.naam.toLowerCase().includes(query.toLowerCase()) &&
    !selectedTags.some(s => s.id === t.id)
  )

  const canCreate =
    query.trim().length > 0 &&
    !allTags.some(t => t.naam.toLowerCase() === query.trim().toLowerCase())

  async function createTag() {
    if (!query.trim() || creating) return
    setCreating(true)
    const { data, error } = await supabase
      .from('tags')
      .insert({ naam: query.trim() })
      .select()
      .single()
    if (!error && data) {
      onTagCreated(data)
      onChange([...selectedTags, data])
      setQuery('')
    }
    setCreating(false)
  }

  async function deleteTag(tag: Tag, e: React.MouseEvent) {
    e.stopPropagation()

    if (deletingTagId) return

    const confirmed = window.confirm(`Tag "${tag.naam}" definitief verwijderen?`)
    if (!confirmed) return

    setDeletingTagId(tag.id)

    await supabase.from('skill_tags').delete().eq('tag_id', tag.id)
    await supabase.from('leerdoel_tags').delete().eq('tag_id', tag.id)

    const { error } = await supabase.from('tags').delete().eq('id', tag.id)

    if (!error) {
      onChange(selectedTags.filter(s => s.id !== tag.id))
      onTagDeleted?.(tag.id)
    }

    setDeletingTagId(null)
  }

  function toggleTag(tag: Tag) {
    if (selectedTags.some(s => s.id === tag.id)) {
      onChange(selectedTags.filter(s => s.id !== tag.id))
    } else {
      onChange([...selectedTags, tag])
    }
    setQuery('')
    inputRef.current?.focus()
  }

  function removeTag(tag: Tag, e: React.MouseEvent) {
    e.stopPropagation()
    onChange(selectedTags.filter(s => s.id !== tag.id))
  }

  return (
    <>
      <style>{`
        .ts-wrap { position: relative; }
        .ts-field {
          min-height: 36px;
          background: #0d1117;
          border: 1px solid #2d333b;
          border-radius: 7px;
          padding: 4px 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 4px;
          align-items: center;
          cursor: text;
          transition: border-color 0.15s;
        }
        .ts-field:focus-within { border-color: #58a6ff; }
        .ts-field.open { border-color: #58a6ff; border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
        .ts-selected-tag {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          background: rgba(88,166,255,0.12);
          border: 1px solid rgba(88,166,255,0.25);
          border-radius: 5px;
          padding: 2px 8px;
          font-family: 'IBM Plex Mono', monospace;
          font-size: 11px;
          color: #58a6ff;
          white-space: nowrap;
          animation: tagPop 0.15s ease;
        }
        .ts-remove {
          background: none;
          border: none;
          color: #58a6ff;
          cursor: pointer;
          font-size: 13px;
          line-height: 1;
          padding: 0;
          opacity: 0.6;
          transition: opacity 0.1s;
          display: flex;
          align-items: center;
        }
        .ts-remove:hover { opacity: 1; }
        .ts-input {
          background: transparent;
          border: none;
          outline: none;
          color: #cdd9e5;
          font-family: 'IBM Plex Sans', sans-serif;
          font-size: 13px;
          flex: 1;
          min-width: 80px;
          padding: 2px 4px;
        }
        .ts-input::placeholder { color: #444c56; }
        .ts-dropdown {
          position: absolute;
          top: 100%;
          left: 0; right: 0;
          background: #161b22;
          border: 1px solid #58a6ff;
          border-top: none;
          border-bottom-left-radius: 7px;
          border-bottom-right-radius: 7px;
          z-index: 100;
          max-height: 220px;
          overflow-y: auto;
          animation: dropDown 0.12s ease;
        }
        .ts-dropdown::-webkit-scrollbar { width: 3px; }
        .ts-dropdown::-webkit-scrollbar-thumb { background: #2d333b; border-radius: 3px; }
        .ts-option {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          font-size: 13px;
          color: #cdd9e5;
          cursor: pointer;
          border-bottom: 1px solid #1c2330;
          transition: background 0.1s;
        }
        .ts-option:last-child { border-bottom: none; }
        .ts-option:hover { background: #1c2330; }
        .ts-option.create {
          color: #58a6ff;
          font-style: italic;
        }
        .ts-option-label {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 0;
        }
        .ts-option-delete {
          background: none;
          border: none;
          color: #768390;
          cursor: pointer;
          font-size: 14px;
          line-height: 1;
          padding: 2px;
          opacity: 0.7;
          transition: opacity 0.1s, color 0.1s;
          flex-shrink: 0;
        }
        .ts-option-delete:hover {
          opacity: 1;
          color: #e05252;
        }
        .ts-option-delete:disabled {
          cursor: not-allowed;
          opacity: 0.4;
        }
        .ts-empty {
          padding: 10px 12px;
          font-size: 12px;
          color: #444c56;
          font-style: italic;
        }
        .ts-dot {
          width: 6px; height: 6px;
          border-radius: 50%;
          background: #58a6ff;
          flex-shrink: 0;
        }
        @keyframes tagPop {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1); opacity: 1; }
        }
        @keyframes dropDown {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div className="ts-wrap" ref={containerRef}>
        <div
          className={`ts-field${open ? ' open' : ''}`}
          onClick={() => { setOpen(true); inputRef.current?.focus() }}
        >
          {selectedTags.map(tag => (
            <span key={tag.id} className="ts-selected-tag">
              {tag.naam}
              <button type="button" className="ts-remove" onClick={(e) => removeTag(tag, e)}>×</button>
            </span>
          ))}
          <input
            ref={inputRef}
            className="ts-input"
            placeholder={selectedTags.length === 0 ? 'Zoek of maak tag...' : ''}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') {
                e.preventDefault()
                if (filtered.length === 1) {
                  toggleTag(filtered[0])
                } else if (canCreate) {
                  createTag()
                }
              }
              if (e.key === 'Escape') {
                setOpen(false)
                setQuery('')
              }
              if (e.key === 'Backspace' && query === '' && selectedTags.length > 0) {
                onChange(selectedTags.slice(0, -1))
              }
            }}
          />
        </div>

        {open && (
          <div className="ts-dropdown">
            {filtered.length === 0 && !canCreate && (
              <div className="ts-empty">
                {query ? 'Geen tags gevonden' : 'Geen tags beschikbaar'}
              </div>
            )}
            {filtered.map(tag => (
              <div key={tag.id} className="ts-option" onClick={() => toggleTag(tag)}>
                <div className="ts-option-label">
                  <span className="ts-dot" />
                  {tag.naam}
                </div>
                <button
                  type="button"
                  className="ts-option-delete"
                  onClick={(e) => deleteTag(tag, e)}
                  disabled={deletingTagId === tag.id}
                  title={`Verwijder tag ${tag.naam}`}
                >
                  {deletingTagId === tag.id ? '...' : '×'}
                </button>
              </div>
            ))}
            {canCreate && (
              <div className="ts-option create" onClick={createTag}>
                {creating ? 'Aanmaken...' : `+ Nieuwe tag "${query.trim()}" aanmaken`}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  )
}
