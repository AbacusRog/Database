export interface Person {
  id: string
  full_name: string
  notes: string | null
}

export interface Company {
  id: string
  name: string
  company_number: string | null
  notes: string | null
  created_at: string
  utr: string | null
  authentication_code: string | null
  vat_number: string | null
  incorporation_date: string | null // ISO date string
}

export interface RoleLink {
  id: string
  company_id: string
  person_id: string
  person: Person
  notes?: string | null
}

export interface ShareholderLink extends RoleLink {
  shares: number | null
}

export type DueDateTask = 'year_end' | 'confirmation_statement' | 'vat_return'

export interface CompanyDueDate {
  id: string
  company_id: string
  task_type: DueDateTask
  due_date: string // ISO date string, e.g. "2026-03-31"
}

export interface CompanyWithRoles extends Company {
  directors: RoleLink[]
  pscs: RoleLink[]
  shareholders: ShareholderLink[]
  due_dates: CompanyDueDate[]
}

export type RoleKind = 'director' | 'psc' | 'shareholder'

export interface PersonRoleEntry {
  companyId: string
  companyName: string
  companyNumber: string | null
  role: RoleKind
  shares?: number | null
}

export interface PersonWithRoles {
  person: Person
  roles: PersonRoleEntry[]
}

export interface UpcomingDueDate {
  companyId: string
  companyName: string
  companyNumber: string | null
  task: DueDateTask
  anchorDate: string
  dueDate: Date | null // the recurring reference date (e.g. accounting year end)
  dueByDate: Date | null // the actual statutory filing deadline
}

