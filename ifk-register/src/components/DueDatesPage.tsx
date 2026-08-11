import { useMemo, useState } from 'react'
import type { CompanyWithRoles, DueDateTask } from '../types'
import { buildUpcomingDueDates, TASK_LABEL, TASK_ORDER, formatDate, daysUntil } from '../lib/dueDates'

interface Props {
  companies: CompanyWithRoles[]
  onClose: () => void
  onSelectCompany: (companyId: string) => void
}

type SortMode = 'dueDate' | 'company' | 'task'

const TASK_DOT: Record<DueDateTask, string> = {
  year_end: 'bg-ledger',
  confirmation_statement: 'bg-brass',
  vat_return: 'bg-steel',
}

function dueSoonClass(days: number): string {
  if (days <= 14) return 'font-medium text-redact'
  if (days <= 30) return 'font-medium text-brass'
  return 'text-ink/60'
}

function dueSoonText(days: number): string {
  if (days <= 0) return 'due now'
  if (days === 1) return 'in 1 day'
  return `in ${days} days`
}

export function DueDatesPage({ companies, onClose, onSelectCompany }: Props) {
  const [sortMode, setSortMode] = useState<SortMode>('dueDate')

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
      // Due date: rows with no date set yet sort to the bottom rather than
      // being hidden, so gaps in the data stay visible.
      if (!a.nextDueDate && !b.nextDueDate) return a.companyName.localeCompare(b.companyName)
      if (!a.nextDueDate) return 1
      if (!b.nextDueDate) return -1
      return a.nextDueDate.getTime() - b.nextDueDate.getTime()
    })
    return copy
  }, [rows, sortMode])

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

      <div className="flex flex-wrap items-center gap-2 border-b border-rule px-4 py-3 sm:px-6">
        <span className="text-xs uppercase tracking-wide text-ink/40">Sort by</span>
        {(['dueDate', 'company', 'task'] as SortMode[]).map((mode) => (
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
            {mode === 'dueDate' ? 'Due date' : mode === 'company' ? 'Company' : 'Task'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-4 py-4 sm:px-6">
          {sorted.length === 0 ? (
            <p className="py-16 text-center text-sm text-ink/50">No companies yet.</p>
          ) : (
            <ol className="border-t border-rule">
              {sorted.map((row) => {
                const days = row.nextDueDate ? daysUntil(row.nextDueDate) : null
                return (
                  <li key={`${row.companyId}-${row.task}`} className="ledger-rule">
                    <button
                      type="button"
                      onClick={() => onSelectCompany(row.companyId)}
                      className="flex w-full flex-col gap-1.5 px-2 py-3 text-left transition-colors hover:bg-ledger/[0.03] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                      <span className="pl-4 text-sm sm:shrink-0 sm:pl-0">
                        {row.nextDueDate && days !== null ? (
                          <>
                            {formatDate(row.nextDueDate)}{' '}
                            <span className={`text-xs ${dueSoonClass(days)}`}>({dueSoonText(days)})</span>
                          </>
                        ) : (
                          <span className="text-xs italic text-ink/40">Not set</span>
                        )}
                      </span>
                    </button>
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
