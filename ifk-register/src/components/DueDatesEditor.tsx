import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { TASK_ORDER, TASK_LABEL, TASK_RECURRENCE_LABEL, nextOccurrence, daysUntil, formatDate } from '../lib/dueDates'
import type { CompanyDueDate, DueDateTask } from '../types'

interface Props {
  companyId: string
  dueDates: CompanyDueDate[]
  editable: boolean
  onChange: () => void
}

function dueSoonClass(days: number): string {
  if (days <= 14) return 'font-medium text-redact'
  if (days <= 30) return 'font-medium text-brass'
  return ''
}

function dueSoonText(days: number): string {
  if (days <= 0) return 'due now'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
}

export function DueDatesEditor({ companyId, dueDates, editable, onChange }: Props) {
  const [values, setValues] = useState<Record<DueDateTask, string>>(() => {
    const initial = {} as Record<DueDateTask, string>
    for (const task of TASK_ORDER) {
      initial[task] = dueDates.find((d) => d.task_type === task)?.due_date ?? ''
    }
    return initial
  })
  const [saving, setSaving] = useState<DueDateTask | null>(null)

  async function save(task: DueDateTask, value: string) {
    const existing = dueDates.find((d) => d.task_type === task)
    if (value === (existing?.due_date ?? '')) return
    setSaving(task)
    if (!value) {
      if (existing) {
        const { error } = await supabase.from('company_due_dates').delete().eq('id', existing.id)
        if (error) console.error(error)
      }
    } else {
      const { error } = await supabase
        .from('company_due_dates')
        .upsert({ company_id: companyId, task_type: task, due_date: value }, { onConflict: 'company_id,task_type' })
      if (error) console.error(error)
    }
    onChange()
    setSaving(null)
  }

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ledger">Due dates</h3>
      <div className="mt-2 grid gap-4 sm:grid-cols-3">
        {TASK_ORDER.map((task) => {
          const anchor = values[task]
          const next = anchor ? nextOccurrence(task, anchor) : null
          const days = next ? daysUntil(next) : null
          return (
            <div key={task}>
              <label className="field-label" htmlFor={`due-${task}`}>
                {TASK_LABEL[task]}{' '}
                <span className="normal-case text-ink/40">— {TASK_RECURRENCE_LABEL[task]}</span>
              </label>

              {editable ? (
                <input
                  id={`due-${task}`}
                  type="date"
                  value={anchor}
                  onChange={(e) => setValues((v) => ({ ...v, [task]: e.target.value }))}
                  onBlur={(e) => save(task, e.target.value)}
                  className="field-input"
                />
              ) : next && days !== null ? (
                <p className="text-sm text-ink">
                  {formatDate(next)} <span className={`text-xs ${dueSoonClass(days)}`}>({dueSoonText(days)})</span>
                </p>
              ) : (
                <p className="text-sm italic text-ink/40">Not set</p>
              )}

              {editable && saving === task && <p className="mt-1 text-xs text-ink/40">saving…</p>}
              {editable && saving !== task && next && days !== null && (
                <p className="mt-1 text-xs text-ink/50">
                  Next due: {formatDate(next)}{' '}
                  <span className={dueSoonClass(days)}>({dueSoonText(days)})</span>
                </p>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
