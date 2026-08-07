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

export interface CompanyWithRoles extends Company {
  directors: RoleLink[]
  pscs: RoleLink[]
  shareholders: ShareholderLink[]
}
