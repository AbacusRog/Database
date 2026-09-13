import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  TASK_ORDER,
  TASK_LABEL,
  TASK_RECURRENCE_LABEL,
  TASK_DUE_BY_OFFSET_LABEL,
  parseDueDate,
  computeDueBy,
  computeNextCycle,
  daysUntil,
  formatDate,
  formatDateIso,
  formatTimestamp,
  trafficLight,
  TRAFFIC_LIGHT_DOT_CLASS,
  TRAFFIC_LIGHT_TEXT_CLASS,
  dueSoonText,
} from '../lib/dueDates'
import { markTaskCompleted, undoCompletion } from '../lib/completionActions'
import type { CompanyDueDate, DueDateCompletion, DueDateTask } from '../types'

interface Props {
  companyId: string
  dueDates: CompanyDueDate[]
  editable: boolean
  onChange: () => void
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
  const [confirmingComplete, setConfirmingComplete] = useState<DueDateTask | null>(null)
  const [completions, setCompletions] = useState<DueDateCompletion[]>([])
  const [expandedHistory, setExpandedHistory] = useState<Record<DueDateTask, boolean>>(
    {} as Record<DueDateTask, boolean>
  )

  const refreshCompletions = useCallback(async () => {
    const { data, error } = await supabase
      .from('company_due_date_completions')
      .select('*')
      .eq('company_id', companyId)
      .order('completed_at', { ascending: false })
    if (error) console.error(error)
    setCompletions((data ?? []) as DueDateCompletion[])
  }, [companyId])

  useEffect(() => {
    refreshCompletions()
  }, [refreshCompletions])

  // Keeps the fields in sync when dueDates changes from outside a direct
  // edit here — most notably the Year-End auto-fill triggered by entering
  // an Incorporation Date, which needs to show up without reopening this
  // panel.
  useEffect(() => {
    setValues(() => {
      const updated = {} as Record<DueDateTask, string>
      for (const task of TASK_ORDER) {
        updated[task] = dueDates.find((d) => d.task_type === task)?.due_date ?? ''
      }
      return updated
    })
  }, [dueDates])

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

  // Explicit, user-triggered advance to the next cycle — never automatic.
  async function markCompleted(task: DueDateTask, currentDueDateIso: string) {
    setSaving(task)
    try {
      await markTaskCompleted(companyId, task, currentDueDateIso)
      await refreshCompletions()
      onChange()
    } catch (err) {
      console.error(err)
    }
    setSaving(null)
    setConfirmingComplete(null)
  }

  async function undo(completion: DueDateCompletion) {
    setSaving(completion.task_type)
    try {
      await undoCompletion(completion)
      await refreshCompletions()
      onChange()
    } catch (err) {
      console.error(err)
    }
    setSaving(null)
  }

  return (
    <div>
      <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ledger">Due dates</h3>
      <div className="mt-2 grid gap-5 sm:grid-cols-3">
        {TASK_ORDER.map((task) => {
          const anchor = values[task]
          const dueDate = anchor ? parseDueDate(anchor) : null
          const dueBy = dueDate ? computeDueBy(task, dueDate) : null
          const dueByDays = dueBy ? daysUntil(dueBy) : null
          const light = dueBy ? trafficLight(dueBy) : null
          const nextCycleDate = dueDate ? computeNextCycle(task, dueDate) : null
          const isConfirming = confirmingComplete === task
          const taskCompletions = completions.filter((c) => c.task_type === task)
          const latestActive = taskCompletions.find((c) => !c.undone_at)
          const isExpanded = !!expandedHistory[task]

          return (
            <div key={task}>
              <label className="field-label" htmlFor={`due-${task}`}>
                {TASK_LABEL[task]}{' '}
                <span className="normal-case text-ink/40">— {TASK_RECURRENCE_LABEL[task]}</span>
              </label>
              <p className="-mt-0.5 mb-1.5 text-[11px] text-ink/40">{TASK_DUE_BY_OFFSET_LABEL[task]}</p>

              {editable ? (
                <input
                  id={`due-${task}`}
                  type="date"
                  value={anchor}
                  onChange={(e) => setValues((v) => ({ ...v, [task]: e.target.value }))}
                  onBlur={(e) => save(task, e.target.value)}
                  className="field-input"
                />
              ) : dueDate && dueBy && dueByDays !== null && light ? (
                <div className="text-sm text-ink">
                  <p className="text-ink/60">Due date: {formatDate(dueDate)}</p>
                  <p className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TRAFFIC_LIGHT_DOT_CLASS[light]}`} />
                    Due by: {formatDate(dueBy)}{' '}
                    <span className={`text-xs ${TRAFFIC_LIGHT_TEXT_CLASS[light]}`}>({dueSoonText(dueByDays)})</span>
                  </p>
                </div>
              ) : (
                <p className="text-sm italic text-ink/40">Not set</p>
              )}

              {editable && saving === task && <p className="mt-1 text-xs text-ink/40">saving…</p>}
              {editable && saving !== task && dueDate && dueBy && dueByDays !== null && light && (
                <div className="mt-1 text-xs text-ink/50">
                  <p>Due date: {formatDate(dueDate)}</p>
                  <p className="flex items-center gap-1.5">
                    <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TRAFFIC_LIGHT_DOT_CLASS[light]}`} />
                    Due by: {formatDate(dueBy)} <span className={TRAFFIC_LIGHT_TEXT_CLASS[light]}>({dueSoonText(dueByDays)})</span>
                  </p>
                </div>
              )}

              {editable && dueDate && saving !== task && (
                <div className="mt-2">
                  {isConfirming && nextCycleDate ? (
                    <div className="rounded-sm border border-brass/40 bg-brass/5 px-2 py-1.5 text-xs">
                      <p className="text-ink/70">Next {TASK_LABEL[task]}: {formatDate(nextCycleDate)}</p>
                      <div className="mt-1.5 flex gap-3">
                        <button
                          type="button"
                          className="font-medium text-ledger hover:underline"
                          onClick={() => markCompleted(task, anchor)}
                        >
                          Confirm
                        </button>
                        <button
                          type="button"
                          className="text-ink/50 hover:underline"
                          onClick={() => setConfirmingComplete(null)}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-xs text-ledger hover:underline"
                      onClick={() => setConfirmingComplete(task)}
                    >
                      Mark completed →
                    </button>
                  )}
                </div>
              )}

              {taskCompletions.length > 0 && (
                <div className="mt-2 border-t border-rule/60 pt-2">
                  {latestActive && (
                    <p className="text-[11px] text-ink/50">
                      Last completed {formatTimestamp(latestActive.completed_at)}
                      {latestActive.completed_by_email ? ` by ${latestActive.completed_by_email}` : ''}
                      {editable && (
                        <>
                          {' — '}
                          <button
                            type="button"
                            className="text-ledger hover:underline"
                            onClick={() => undo(latestActive)}
                            disabled={saving === task}
                          >
                            Undo
                          </button>
                        </>
                      )}
                    </p>
                  )}
                  <button
                    type="button"
                    className="mt-1 text-[11px] text-ink/40 hover:underline"
                    onClick={() => setExpandedHistory((v) => ({ ...v, [task]: !v[task] }))}
                  >
                    {isExpanded ? 'Hide history' : `View history (${taskCompletions.length})`}
                  </button>
                  {isExpanded && (
                    <ul className="mt-1 space-y-1 text-[11px] text-ink/50">
                      {taskCompletions.map((c) => (
                        <li key={c.id} className={c.undone_at ? 'italic line-through opacity-60' : ''}>
                          {formatTimestamp(c.completed_at)}: {formatDateIso(c.previous_due_date)} → {formatDateIso(c.new_due_date)}
                          {c.completed_by_email ? ` (${c.completed_by_email})` : ''}
                          {c.undone_at ? ' — undone' : ''}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
