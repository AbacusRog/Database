import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { CompanyWithRoles } from '../types'

const SELECT = `
  id, name, company_number, notes, created_at, utr, authentication_code, vat_number, incorporation_date,
  directors:company_directors ( id, company_id, person_id, notes, person:people ( id, full_name, notes ) ),
  pscs:company_pscs ( id, company_id, person_id, notes, person:people ( id, full_name, notes ) ),
  shareholders:company_shareholders ( id, company_id, person_id, shares, notes, person:people ( id, full_name, notes ) ),
  due_dates:company_due_dates ( id, company_id, task_type, due_date )
`

export function useCompanies(enabled: boolean) {
  const [companies, setCompanies] = useState<CompanyWithRoles[]>([])
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    const { data, error } = await supabase
      .from('companies')
      .select(SELECT)
      .order('name', { ascending: true })

    if (error) {
      setError(error.message)
    } else {
      setError(null)
      setCompanies((data ?? []) as unknown as CompanyWithRoles[])
    }
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      refresh()
    } else {
      // Signed out: don't hold onto previously-loaded data or keep polling —
      // RLS would block the request anyway, but there's no reason to send it.
      setCompanies([])
      setError(null)
      setLoading(false)
    }
  }, [enabled, refresh])

  return { companies, loading, error, refresh }
}

/** Matches a company if the search term appears in its name, number, or any
 *  linked person's name (director, PSC, or shareholder). */
export function matchesSearch(company: CompanyWithRoles, term: string): boolean {
  if (!term.trim()) return true
  const q = term.trim().toLowerCase()
  if (company.name.toLowerCase().includes(q)) return true
  if (company.company_number?.toLowerCase().includes(q)) return true
  const people = [
    ...company.directors.map((d) => d.person.full_name),
    ...company.pscs.map((d) => d.person.full_name),
    ...company.shareholders.map((d) => d.person.full_name),
  ]
  return people.some((name) => name.toLowerCase().includes(q))
}
