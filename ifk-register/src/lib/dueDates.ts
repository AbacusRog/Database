import type { CompanyWithRoles, DueDateTask, UpcomingDueDate } from '../types'

export const TASK_ORDER: DueDateTask[] = ['year_end', 'confirmation_statement', 'vat_return']

export const TASK_LABEL: Record<DueDateTask, string> = {
  year_end: 'Year-End',
  confirmation_statement: 'Confirmation Statement',
  vat_return: 'VAT Return',
}

export const TASK_RECURRENCE_LABEL: Record<DueDateTask, string> = {
  year_end: 'Annually',
  confirmation_statement: 'Annually',
  vat_return: 'Quarterly',
}

/** Human-readable statutory offset from the due date to the actual filing
 *  deadline, shown next to each field so the 9-months/1-year-14-days/etc.
 *  rule is visible rather than hidden inside the calculation. */
export const TASK_DUE_BY_OFFSET_LABEL: Record<DueDateTask, string> = {
  year_end: 'due by 9 months after',
  confirmation_statement: 'due by 1 year + 14 days after',
  vat_return: 'due by 1 month + 7 days after',
}

const TASK_INTERVAL_MONTHS: Record<DueDateTask, number> = {
  year_end: 12,
  confirmation_statement: 12,
  vat_return: 3,
}

/** Adds a number of months to a date, clamping the day to the last valid day
 *  of the resulting month instead of overflowing (e.g. 31 Aug + 3 months
 *  lands on 30 Nov, not 1 Dec — important since VAT quarters and year-ends
 *  are often anchored to month-end dates). */
function addMonthsClamped(date: Date, months: number): Date {
  const day = date.getDate()
  const target = new Date(date.getFullYear(), date.getMonth() + months, 1)
  const daysInTargetMonth = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate()
  target.setDate(Math.min(day, daysInTargetMonth))
  return target
}

function parseDateOnly(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

function startOfToday(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

/** Rolls a stored anchor date forward by its task's recurrence interval
 *  until it lands on today or later. The anchor never needs updating by
 *  hand — a date entered once keeps producing the correct "next due" date
 *  indefinitely. */
export function nextOccurrence(task: DueDateTask, anchorDateIso: string, from: Date = startOfToday()): Date {
  const interval = TASK_INTERVAL_MONTHS[task]
  let next = parseDateOnly(anchorDateIso)
  // Safety cap: even a decades-old quarterly anchor resolves in well under
  // 200 steps, so this only guards against genuinely bad data.
  let guard = 0
  while (next < from && guard < 1000) {
    next = addMonthsClamped(next, interval)
    guard++
  }
  return next
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d
}

/** Turns a due date into the actual statutory filing deadline ("due by"):
 *  - Year-End: accounts are due 9 months after the accounting year end.
 *  - Confirmation Statement: due 14 days after the 1-year review period ends.
 *  - VAT Return: due 1 month and 7 days after the VAT period ends.
 *  Example: year end 31 May 2026 → due by 28 Feb 2027. */
export function computeDueBy(task: DueDateTask, dueDate: Date): Date {
  switch (task) {
    case 'year_end':
      return addMonthsClamped(dueDate, 9)
    case 'confirmation_statement':
      return addDays(addMonthsClamped(dueDate, 12), 14)
    case 'vat_return':
      return addDays(addMonthsClamped(dueDate, 1), 7)
  }
}

export function daysUntil(date: Date, from: Date = startOfToday()): number {
  const msPerDay = 24 * 60 * 60 * 1000
  return Math.round((date.getTime() - from.getTime()) / msPerDay)
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export function formatDateIso(iso: string): string {
  return formatDate(parseDateOnly(iso))
}

/** Builds one row per (company, task) — including tasks with no due date
 *  set yet, so gaps in the data are visible rather than silently skipped. */
export function buildUpcomingDueDates(companies: CompanyWithRoles[]): UpcomingDueDate[] {
  const rows: UpcomingDueDate[] = []
  for (const company of companies) {
    for (const task of TASK_ORDER) {
      const record = company.due_dates.find((d) => d.task_type === task)
      const dueDate = record ? nextOccurrence(task, record.due_date) : null
      rows.push({
        companyId: company.id,
        companyName: company.name,
        companyNumber: company.company_number,
        task,
        anchorDate: record?.due_date ?? '',
        dueDate,
        dueByDate: dueDate ? computeDueBy(task, dueDate) : null,
      })
    }
  }
  return rows
}
