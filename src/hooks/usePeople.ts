import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import type { Person } from '../types'

export function usePeople() {
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase.from('people').select('id, full_name, notes').order('full_name')
    setPeople(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  /** Finds an existing person by exact name (case-insensitive), or creates one. */
  async function findOrCreate(fullName: string): Promise<Person | null> {
    const trimmed = fullName.trim()
    if (!trimmed) return null

    const existing = people.find((p) => p.full_name.toLowerCase() === trimmed.toLowerCase())
    if (existing) return existing

    const { data, error } = await supabase
      .from('people')
      .insert({ full_name: trimmed })
      .select('id, full_name, notes')
      .single()

    if (error) {
      console.error(error)
      return null
    }
    setPeople((prev) => [...prev, data].sort((a, b) => a.full_name.localeCompare(b.full_name)))
    return data
  }

  return { people, loading, refresh, findOrCreate }
}
