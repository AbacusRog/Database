import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useIsAdmin(enabled: boolean) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(enabled)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setLoading(true)
    const { data, error } = await supabase.rpc('is_admin')
    if (error) {
      console.error(error)
      setIsAdmin(false)
    } else {
      setIsAdmin(!!data)
    }
    setLoading(false)
  }, [enabled])

  useEffect(() => {
    if (enabled) {
      refresh()
    } else {
      setIsAdmin(false)
      setLoading(false)
    }
  }, [enabled, refresh])

  return { isAdmin, loading, refresh }
}
