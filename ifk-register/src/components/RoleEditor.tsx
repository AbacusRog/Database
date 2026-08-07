import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { PersonPicker } from './PersonPicker'
import type { Person, RoleLink, ShareholderLink } from '../types'

type Role = 'director' | 'psc' | 'shareholder'

const TABLE: Record<Role, string> = {
  director: 'company_directors',
  psc: 'company_pscs',
  shareholder: 'company_shareholders',
}

const LABEL: Record<Role, { singular: string; plural: string; empty: string }> = {
  director: { singular: 'Director', plural: 'Directors', empty: 'No directors on record.' },
  psc: {
    singular: 'Person with significant control',
    plural: 'Persons with significant control',
    empty: 'No PSC on record.',
  },
  shareholder: { singular: 'Shareholder', plural: 'Shareholders', empty: 'No shareholders on record.' },
}

interface Props {
  companyId: string
  role: Role
  links: RoleLink[] | ShareholderLink[]
  editable: boolean
  onChange: () => void
  people: Person[]
  findOrCreate: (name: string) => Promise<Person | null>
  onSelectPerson: (personId: string) => void
}

export function RoleEditor({ companyId, role, links, editable, onChange, people, findOrCreate, onSelectPerson }: Props) {
  const [busy, setBusy] = useState(false)
  const label = LABEL[role]
  const isShareholder = role === 'shareholder'

  async function addPerson(name: string) {
    setBusy(true)
    const person = await findOrCreate(name)
    if (person) {
      const payload: Record<string, unknown> = { company_id: companyId, person_id: person.id }
      if (isShareholder) payload.shares = null
      const { error } = await supabase.from(TABLE[role]).insert(payload)
      if (error && error.code !== '23505') console.error(error) // 23505 = already linked
      onChange()
    }
    setBusy(false)
  }

  async function removeLink(linkId: string) {
    setBusy(true)
    const { error } = await supabase.from(TABLE[role]).delete().eq('id', linkId)
    if (error) console.error(error)
    onChange()
    setBusy(false)
  }

  async function updateShares(linkId: string, shares: string) {
    const value = shares.trim() === '' ? null : Number(shares)
    if (value !== null && Number.isNaN(value)) return
    const { error } = await supabase.from(TABLE[role]).update({ shares: value }).eq('id', linkId)
    if (error) console.error(error)
    onChange()
  }

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ledger">
        {label.plural}
      </h3>
      {links.length === 0 ? (
        <p className="mt-1 text-sm text-ink/50 italic">{label.empty}</p>
      ) : (
        <ul className="mt-2 divide-y divide-rule">
          {links.map((link) => (
            <li key={link.id} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-sm">
                <button
                  type="button"
                  onClick={() => onSelectPerson(link.person_id)}
                  className="underline decoration-dotted decoration-ink/30 hover:decoration-ledger hover:text-ledger"
                >
                  {link.person.full_name}
                </button>
              </span>
              <div className="flex items-center gap-2">
                {isShareholder && (
                  <input
                    type="number"
                    min={0}
                    disabled={!editable}
                    defaultValue={(link as ShareholderLink).shares ?? ''}
                    onBlur={(e) => updateShares(link.id, e.target.value)}
                    placeholder="shares"
                    className="w-24 rounded-sm border border-ink/20 bg-white/60 px-2 py-1 text-right font-mono text-xs disabled:border-transparent disabled:bg-transparent"
                  />
                )}
                {editable && (
                  <button
                    type="button"
                    className="text-xs text-redact hover:underline disabled:opacity-40"
                    disabled={busy}
                    onClick={() => removeLink(link.id)}
                    aria-label={`Remove ${link.person.full_name} from ${label.singular.toLowerCase()}s`}
                  >
                    Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
      {editable && (
        <div className="mt-2">
          <PersonPicker
            people={people}
            excludeIds={links.map((l) => l.person_id)}
            onPick={addPerson}
            placeholder={`Add a ${label.singular.toLowerCase()}…`}
          />
        </div>
      )}
    </div>
  )
}
