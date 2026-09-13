import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Props {
  companyId: string
  editable: boolean
  isAdmin: boolean
}

export function AuthenticationCodeField({ companyId, editable, isAdmin }: Props) {
  const [value, setValue] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!isAdmin) return
    let cancelled = false
    setLoaded(false)
    supabase
      .from('company_authentication_codes')
      .select('authentication_code')
      .eq('company_id', companyId)
      .maybeSingle()
      .then(({ data, error }) => {
        if (cancelled) return
        if (error) console.error(error)
        setValue(data?.authentication_code ?? '')
        setLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [companyId, isAdmin])

  async function save(next: string) {
    setSaving(true)
    if (!next.trim()) {
      const { error } = await supabase.from('company_authentication_codes').delete().eq('company_id', companyId)
      if (error) console.error(error)
    } else {
      const { error } = await supabase
        .from('company_authentication_codes')
        .upsert({ company_id: companyId, authentication_code: next.trim() }, { onConflict: 'company_id' })
      if (error) console.error(error)
    }
    setSaving(false)
  }

  return (
    <div>
      <label className="field-label" htmlFor="detail-auth-code">
        Authentication Code
      </label>
      {!isAdmin ? (
        <p className="text-sm italic text-ink/40">Restricted — admin access only</p>
      ) : !loaded ? (
        <p className="text-sm text-ink/40">Loading…</p>
      ) : editable ? (
        <input
          id="detail-auth-code"
          className="field-input"
          value={value}
          placeholder="e.g. Ab1Cd2"
          onChange={(e) => setValue(e.target.value)}
          onBlur={(e) => save(e.target.value)}
        />
      ) : (
        <p className="text-sm text-ink">{value || <span className="italic text-ink/40">Not set</span>}</p>
      )}
      {saving && <p className="mt-1 text-xs text-ink/40">saving…</p>}
    </div>
  )
}
