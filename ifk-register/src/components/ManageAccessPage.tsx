import { useEffect, useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

interface AdminRow {
  user_id: string
  email: string
  created_at: string
}

interface Props {
  onClose: () => void
}

export function ManageAccessPage({ onClose }: Props) {
  const [admins, setAdmins] = useState<AdminRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [email, setEmail] = useState('')
  const [adding, setAdding] = useState(false)
  const [addError, setAddError] = useState<string | null>(null)
  const [removingId, setRemovingId] = useState<string | null>(null)

  async function refresh() {
    setLoading(true)
    const { data, error } = await supabase.rpc('admin_list_user_roles')
    if (error) {
      console.error(error)
      setLoadError(error.message)
    } else {
      setLoadError(null)
      setAdmins((data ?? []) as AdminRow[])
    }
    setLoading(false)
  }

  useEffect(() => {
    refresh()
  }, [])

  async function addAdmin(e: FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setAdding(true)
    setAddError(null)
    const { error } = await supabase.rpc('admin_add_user_role', { target_email: email.trim() })
    setAdding(false)
    if (error) {
      setAddError(error.message)
      return
    }
    setEmail('')
    refresh()
  }

  async function removeAdmin(userId: string) {
    setRemovingId(userId)
    const { error } = await supabase.from('user_roles').delete().eq('user_id', userId)
    if (error) console.error(error)
    await refresh()
    setRemovingId(null)
  }

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper">
      <div className="flex items-center justify-between border-b border-rule px-4 py-3 sm:px-6 sm:py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brass">Group corporate record</p>
          <h2 className="font-display text-xl font-semibold text-ledger">Manage access</h2>
        </div>
        <button type="button" onClick={onClose} className="btn-secondary text-xs">
          Close
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-lg px-4 py-6 sm:px-6">
          <p className="text-sm text-ink/60">
            Admins can view, add, amend, and delete each company's Authentication Code — everyone
            else sees it marked as restricted. Add someone by the email they sign in with; they
            need to have signed in at least once already for their account to exist.
          </p>

          <form onSubmit={addAdmin} className="mt-5 flex flex-col gap-2 sm:flex-row">
            <input
              type="email"
              className="field-input"
              placeholder="someone@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <button type="submit" className="btn-primary shrink-0" disabled={adding}>
              {adding ? 'Adding…' : 'Add admin'}
            </button>
          </form>
          {addError && <p className="mt-2 text-sm text-redact">{addError}</p>}

          <div className="mt-6">
            <h3 className="font-display text-sm font-semibold uppercase tracking-wide text-ledger">
              Current admins
            </h3>
            {loading ? (
              <p className="mt-2 text-sm text-ink/50">Loading…</p>
            ) : loadError ? (
              <p className="mt-2 text-sm text-redact">{loadError}</p>
            ) : admins.length === 0 ? (
              <p className="mt-2 text-sm italic text-ink/40">No admins set yet.</p>
            ) : (
              <ul className="mt-2 divide-y divide-rule">
                {admins.map((a) => (
                  <li key={a.user_id} className="flex items-center justify-between gap-3 py-2.5">
                    <span className="min-w-0 truncate text-sm">{a.email}</span>
                    <button
                      type="button"
                      className="shrink-0 rounded-sm px-2 py-1 text-xs text-redact hover:bg-redact/10 hover:underline disabled:opacity-40"
                      disabled={removingId === a.user_id}
                      onClick={() => removeAdmin(a.user_id)}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-3 text-xs text-ink/40">
              Careful removing the last admin — there's no other way back in except running SQL
              directly in the Supabase dashboard.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
