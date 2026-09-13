import { useMemo, useState } from 'react'
import type { CompanyWithRoles, DueDateCompletion, DueDateTask } from '../types'
import {
  buildUpcomingDueDates,
  TASK_LABEL,
  TASK_ORDER,
  formatDate,
  daysUntil,
  trafficLight,
  TRAFFIC_LIGHT_DOT_CLASS,
  TRAFFIC_LIGHT_TEXT_CLASS,
  TRAFFIC_LIGHT_ROW_ACCENT_CLASS,
  dueSoonText,
  computeNextCycle,
} from '../lib/dueDates'
import { markTaskCompleted, undoCompletion } from '../lib/completionActions'

interface Props {
  companies: CompanyWithRoles[]
  loading: boolean
  editable: boolean
  onChange: () => void
  onClose: () => void
  onSelectCompany: (companyId: string) => void
}

type SortMode = 'dueBy' | 'company' | 'task'

const TASK_DOT: Record<DueDateTask, string> = {
  year_end: 'bg-ledger',
  confirmation_statement: 'bg-brass',
  vat_return: 'bg-steel',
}

function rowKey(companyId: string, task: DueDateTask): string {
  return `${companyId}-${task}`
}

export function DueDatesPage({ companies, loading, editable, onChange, onClose, onSelectCompany }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('dueBy')
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  // Rows completed during this visit to the page, so an "Undo" is right
  // there without needing to open the company. Resets when the page
  // closes — undoing something from an earlier session happens from the
  // company's own Due dates history instead.
  const [justCompleted, setJustCompleted] = useState<Record<string, DueDateCompletion>>({})

  const rows = useMemo(() => buildUpcomingDueDates(companies), [companies])

  const sorted = useMemo(() => {
    const copy = [...rows]
    copy.sort((a, b) => {
      if (sortMode === 'company') {
        const byName = a.companyName.localeCompare(b.companyName)
        return byName !== 0 ? byName : TASK_ORDER.indexOf(a.task) - TASK_ORDER.indexOf(b.task)
      }
      if (sortMode === 'task') {
        const byTask = TASK_ORDER.indexOf(a.task) - TASK_ORDER.indexOf(b.task)
        return byTask !== 0 ? byTask : a.companyName.localeCompare(b.companyName)
      }
      // Due by: rows with no date set yet sort to the bottom rather than
      // being hidden, so gaps in the data stay visible.
      if (!a.dueByDate && !b.dueByDate) return a.companyName.localeCompare(b.companyName)
      if (!a.dueByDate) return 1
      if (!b.dueByDate) return -1
      return a.dueByDate.getTime() - b.dueByDate.getTime()
    })
    return copy
  }, [rows, sortMode])

  // Explicit, user-triggered advance to the next cycle — never automatic.
  async function markCompleted(companyId: string, task: DueDateTask, currentDueDateIso: string) {
    const key = rowKey(companyId, task)
    setSavingKey(key)
    try {
      const { completion } = await markTaskCompleted(companyId, task, currentDueDateIso)
      setJustCompleted((v) => ({ ...v, [key]: completion }))
      onChange()
    } catch (err) {
      console.error(err)
    }
    setSavingKey(null)
    setConfirmingKey(null)
  }

  async function undo(key: string, completion: DueDateCompletion) {
    setSavingKey(key)
    try {
      await undoCompletion(completion)
      setJustCompleted((v) => {
        const next = { ...v }
        delete next[key]
        return next
      })
      onChange()
    } catch (err) {
      console.error(err)
    }
    setSavingKey(null)
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper">
      <div className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brass">Group corporate record</p>
          <h2 className="font-display text-xl font-semibold text-ledger">Due dates</h2>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary self-start text-xs sm:self-auto">
          Close
        </button>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-rule px-4 py-3 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-ink/40">Sort by</span>
          {(['dueBy', 'company', 'task'] as SortMode[]).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSortMode(mode)}
              className={`rounded-full border px-3 py-1.5 text-xs transition-colors ${
                sortMode === mode
                  ? 'border-ledger bg-ledger text-paper'
                  : 'border-ink/20 text-ink/60 hover:border-ink/40'
              }`}
            >
              {mode === 'dueBy' ? 'Due by' : mode === 'company' ? 'Company' : 'Task'}
            </button>
          ))}
        </div>
        <ul className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink/60">
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-red-600" /> Due within 1 month
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" /> Due within 2 months
          </li>
          <li className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-green-600" /> More than 2 months
          </li>
        </ul>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          {loading ? (
            <p className="py-16 text-center text-sm text-ink/50">Loading due dates…</p>
          ) : sorted.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink/50">No companies yet.</p>
          ) : (
            <ol className="border-t border-rule">
              {sorted.map((row) => {
                const dueByDays = row.dueByDate ? daysUntil(row.dueByDate) : null
                const light = row.dueByDate ? trafficLight(row.dueByDate) : null
                const rowAccent = light ? TRAFFIC_LIGHT_ROW_ACCENT_CLASS[light] : 'border-l-4 border-transparent'
                const key = rowKey(row.companyId, row.task)
                const isConfirming = confirmingKey === key
                const isSaving = savingKey === key
                const justCompletedHere = justCompleted[key]
                const nextCycleDate = row.dueDate ? computeNextCycle(row.task, row.dueDate) : null
                return (
                  <li key={key} className={`ledger-rule ${rowAccent}`}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => !isConfirming && onSelectCompany(row.companyId)}
                      onKeyDown={(e) => {
                        if ((e.key === 'Enter' || e.key === ' ') && !isConfirming) {
                          e.preventDefault()
                          onSelectCompany(row.companyId)
                        }
                      }}
                      className="flex w-full cursor-pointer flex-col gap-1.5 px-2 py-3 text-left transition-colors hover:bg-ledger/[0.06] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TASK_DOT[row.task]}`} />
                        <span className="shrink-0 text-xs uppercase tracking-wide text-ink/50">
                          {TASK_LABEL[row.task]}
                        </span>
                        <span className="truncate font-display text-base font-medium text-ledger">
                          {row.companyName}
                        </span>
                      </span>

                      <span className="flex flex-wrap items-center gap-3 pl-4 text-right text-xs sm:shrink-0 sm:pl-0">
                        {row.dueDate && row.dueByDate && dueByDays !== null && light ? (
                          <span className="flex items-center gap-2">
                            <span className={`hidden h-2 w-2 shrink-0 rounded-full sm:inline-block ${TRAFFIC_LIGHT_DOT_CLASS[light]}`} />
                            <span>
                              <span className="block text-ink/50">Due date {formatDate(row.dueDate)}</span>
                              <span className={`flex items-center gap-1.5 text-sm ${TRAFFIC_LIGHT_TEXT_CLASS[light]}`}>
                                <span className={`h-2 w-2 shrink-0 rounded-full sm:hidden ${TRAFFIC_LIGHT_DOT_CLASS[light]}`} />
                                Due by {formatDate(row.dueByDate)} ({dueSoonText(dueByDays)})
                              </span>
                            </span>
                          </span>
                        ) : (
                          <span className="italic text-ink/40">Not set</span>
                        )}

                        {editable && !isSaving && (
                          <span onClick={(e) => e.stopPropagation()}>
                            {justCompletedHere ? (
                              <span className="flex items-center gap-2 rounded-sm border border-ledger/30 bg-ledger/5 px-2 py-1 text-xs">
                                <span className="text-ink/70">Completed</span>
                                <button
                                  type="button"
                                  className="font-medium text-ledger hover:underline"
                                  onClick={() => undo(key, justCompletedHere)}
                                >
                                  Undo
                                </button>
                              </span>
                            ) : isConfirming && nextCycleDate ? (
                              <span className="flex items-center gap-2 rounded-sm border border-brass/40 bg-brass/5 px-2 py-1 text-xs">
                                <span className="text-ink/70">Next: {formatDate(nextCycleDate)}</span>
                                <button
                                  type="button"
                                  className="font-medium text-ledger hover:underline"
                                  onClick={() => markCompleted(row.companyId, row.task, row.anchorDate)}
                                >
                                  Confirm
                                </button>
                                <button
                                  type="button"
                                  className="text-ink/50 hover:underline"
                                  onClick={() => setConfirmingKey(null)}
                                >
                                  Cancel
                                </button>
                              </span>
                            ) : row.dueDate ? (
                              <button
                                type="button"
                                className="shrink-0 rounded-full border border-ledger/30 px-2.5 py-1 text-xs text-ledger hover:bg-ledger/10"
                                onClick={() => setConfirmingKey(key)}
                              >
                                Mark completed
                              </button>
                            ) : null}
                          </span>
                        )}
                        {isSaving && <span className="text-xs text-ink/40">saving…</span>}
                      </span>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </div>
      </div>
    </div>
  )
}
