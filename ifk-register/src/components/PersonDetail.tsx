import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { PersonWithRoles, RoleKind } from '../types'

const ROLE_LABEL: Record<RoleKind, string> = {
  director: 'Director',
  psc: 'Person with significant control',
  shareholder: 'Shareholder',
}

const ROLE_DOT: Record<RoleKind, string> = {
  director: 'bg-ledger',
  psc: 'bg-brass',
  shareholder: 'bg-steel',
}

interface Props {
  entry: PersonWithRoles
  editable: boolean
  onChange: () => void
  onClose: () => void
  onSelectCompany: (companyId: string) => void
}

export function PersonDetail({ entry, editable, onChange, onClose, onSelectCompany }: Props) {
  const [name, setName] = useState(entry.person.full_name)
  const [saving, setSaving] = useState(false)

  async function saveName() {
    if (!name.trim() || name === entry.person.full_name) return
    setSaving(true)
    const { error } = await supabase
      .from('people')
      .update({ full_name: name.trim() })
      .eq('id', entry.person.id)
    if (error) console.error(error)
    onChange()
    setSaving(false)
  }

  // Group roles by company so a person who is e.g. both director and
  // shareholder of the same company shows as one row with two badges.
  const byCompany = new Map<string, { companyName: string; companyNumber: string | null; roles: typeof entry.roles }>()
  for (const r of entry.roles) {
    const existing = byCompany.get(r.companyId)
    if (existing) existing.roles.push(r)
    else byCompany.set(r.companyId, { companyName: r.companyName, companyNumber: r.companyNumber, roles: [r] })
  }

  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center overflow-y-auto bg-ink/40 px-3 py-4 sm:px-4 sm:py-8" onClick={onClose}>
      <div className="w-full max-w-xl rounded-sm border border-rule bg-paper shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between border-b border-rule px-4 py-4 sm:px-6 sm:py-5">
          <div className="flex-1">
            <p className="text-xs uppercase tracking-wide text-ink/50">Individual</p>
            {editable ? (
              <input
                className="w-full bg-transparent font-display text-xl font-semibold text-ledger focus:outline-none sm:text-2xl"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={saveName}
              />
            ) : (
              <h2 className="font-display text-xl font-semibold text-ledger sm:text-2xl">{entry.person.full_name}</h2>
            )}
            {saving && <span className="text-xs text-ink/40">saving…</span>}
            <p className="mt-1 text-sm text-ink/50">
              Linked to {byCompany.size} compan{byCompany.size === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="close-btn">
            ×
          </button>
        </div>

        <ul className="divide-y divide-rule px-4 py-2 sm:px-6">
          {[...byCompany.entries()].map(([companyId, c]) => (
            <li key={companyId} className="py-3">
              <button
                type="button"
                onClick={() => onSelectCompany(companyId)}
                className="text-left font-display text-base font-medium text-ledger hover:underline"
              >
                {c.companyName}
              </button>
              <span className="seal ml-2 border-brass/50 px-1.5 py-0.5 text-[10px]">
                {c.companyNumber ?? 'no. —'}
              </span>
              <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/60">
                {c.roles.map((r, i) => (
                  <span key={i} className="inline-flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 rounded-full ${ROLE_DOT[r.role]}`} />
                    {ROLE_LABEL[r.role]}
                    {r.role === 'shareholder' && r.shares != null && (
                      <span className="font-mono">— {r.shares} shares</span>
                    )}
                  </span>
                ))}
              </div>
            </li>
          ))}
        </ul>

        <div className="border-t border-rule px-4 py-3 text-xs text-ink/40 sm:px-6">
          To remove this person from a company, open that company and use Remove next to their name.
        </div>
      </div>
    </div>
  )
}
