import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  FIRST_YEAR_END_RULE_CUTOFF,
  computeFirstYearEnd,
  formatIsoDate,
  formatDateIso,
} from '../lib/dueDates'
import { AuthenticationCodeField } from './AuthenticationCodeField'
import type { CompanyDueDate } from '../types'

interface Props {
  companyId: string
  utr: string | null
  vatNumber: string | null
  incorporationDate: string | null
  dueDates: CompanyDueDate[]
  editable: boolean
  isAdmin: boolean
  onChange: () => void
}

const FIELDS: { key: 'utr' | 'vat_number'; label: string; placeholder: string }[] = [
  { key: 'utr', label: 'UTR', placeholder: '10-digit UTR' },
  { key: 'vat_number', label: 'VAT Number', placeholder: 'e.g. GB123456789' },
]

export function CompanyDetailsEditor({
  companyId,
  utr,
  vatNumber,
  incorporationDate,
  dueDates,
  editable,
  isAdmin,
  onChange,
}: Props) {
  const [values, setValues] = useState({
    utr: utr ?? '',
    vat_number: vatNumber ?? '',
  })
  const [incDate, setIncDate] = useState(incorporationDate ?? '')
  const [saving, setSaving] = useState<string | null>(null)

  async function saveTextField(key: 'utr' | 'vat_number', value: string, original: string) {
    if (value === original) return
    setSaving(key)
    const { error } = await supabase
      .from('companies')
      .update({ [key]: value.trim() || null })
      .eq('id', companyId)
    if (error) console.error(error)
    onChange()
    setSaving(null)
  }

  async function saveIncorporationDate(value: string) {
    if (value === (incorporationDate ?? '')) return
    setSaving('incorporation_date')
    const { error } = await supabase
      .from('companies')
      .update({ incorporation_date: value || null })
      .eq('id', companyId)
    if (error) {
      console.error(error)
      setSaving(null)
      return
    }

    // Newly incorporated companies get their first Year-End calculated
    // automatically — but only as a starting suggestion, so it never
    // overwrites a Year-End someone has already entered.
    const hasYearEnd = dueDates.some((d) => d.task_type === 'year_end')
    if (value && !hasYearEnd) {
      const [y, m, d] = value.split('-').map(Number)
      const incorporation = new Date(y, m - 1, d)
      if (incorporation > FIRST_YEAR_END_RULE_CUTOFF) {
        const firstYearEnd = computeFirstYearEnd(incorporation)
        const { error: dueDateError } = await supabase.from('company_due_dates').upsert(
          { company_id: companyId, task_type: 'year_end', due_date: formatIsoDate(firstYearEnd) },
          { onConflict: 'company_id,task_type' }
        )
        if (dueDateError) console.error(dueDateError)
      }
    }

    onChange()
    setSaving(null)
  }

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ledger">
        Company details
      </h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-4">
        {FIELDS.map(({ key, label, placeholder }) => (
          <div key={key}>
            <label className="field-label" htmlFor={`detail-${key}`}>
              {label}
            </label>
            {editable ? (
              <input
                id={`detail-${key}`}
                className="field-input"
                value={values[key]}
                placeholder={placeholder}
                onChange={(e) => setValues((v) => ({ ...v, [key]: e.target.value }))}
                onBlur={(e) =>
                  saveTextField(key, e.target.value, key === 'utr' ? utr ?? '' : vatNumber ?? '')
                }
              />
            ) : (
              <p className="text-sm text-ink">{values[key] || <span className="italic text-ink/40">Not set</span>}</p>
            )}
            {saving === key && <p className="mt-1 text-xs text-ink/40">saving…</p>}
          </div>
        ))}

        <AuthenticationCodeField companyId={companyId} editable={editable} isAdmin={isAdmin} />

        <div>
          <label className="field-label" htmlFor="detail-incorporation-date">
            Incorporation Date
          </label>
          {editable ? (
            <input
              id="detail-incorporation-date"
              type="date"
              className="field-input"
              value={incDate}
              onChange={(e) => setIncDate(e.target.value)}
              onBlur={(e) => saveIncorporationDate(e.target.value)}
            />
          ) : (
            <p className="text-sm text-ink">
              {incDate ? formatDateIso(incDate) : <span className="italic text-ink/40">Not set</span>}
            </p>
          )}
          {saving === 'incorporation_date' && <p className="mt-1 text-xs text-ink/40">saving…</p>}
          {editable && (
            <p className="mt-1 text-[11px] text-ink/40">
              Companies incorporated after 31 Aug 2025 get their first Year-End calculated automatically.
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
