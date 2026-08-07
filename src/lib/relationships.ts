import type { CompanyWithRoles, PersonWithRoles } from '../types'

/** Builds a map of personId -> { person, roles across every company } from
 *  the already-loaded companies list. No extra network calls — everything
 *  needed is already nested in the companies query. */
export function buildPersonIndex(companies: CompanyWithRoles[]): Map<string, PersonWithRoles> {
  const index = new Map<string, PersonWithRoles>()

  function add(
    companyId: string,
    companyName: string,
    companyNumber: string | null,
    role: 'director' | 'psc' | 'shareholder',
    personId: string,
    personName: string,
    personNotes: string | null,
    shares?: number | null
  ) {
    const existing = index.get(personId)
    const entry = { companyId, companyName, companyNumber, role, shares }
    if (existing) {
      existing.roles.push(entry)
    } else {
      index.set(personId, {
        person: { id: personId, full_name: personName, notes: personNotes },
        roles: [entry],
      })
    }
  }

  for (const company of companies) {
    for (const d of company.directors) {
      add(company.id, company.name, company.company_number, 'director', d.person_id, d.person.full_name, d.person.notes)
    }
    for (const p of company.pscs) {
      add(company.id, company.name, company.company_number, 'psc', p.person_id, p.person.full_name, p.person.notes)
    }
    for (const s of company.shareholders) {
      add(
        company.id,
        company.name,
        company.company_number,
        'shareholder',
        s.person_id,
        s.person.full_name,
        s.person.notes,
        s.shares
      )
    }
  }

  return index
}
