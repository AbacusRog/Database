import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabaseClient'

interface Props {
  onCreated: () => void
  onClose: () => void
}

export function AddCompanyForm({ onCreated, onClose }: Props) {
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Company name is required.')
      return
    }
    setSaving(true)
    setError(null)
    const { error } = await supabase
      .from('companies')
      .insert({ name: name.trim(), company_number: number.trim() || null })
    setSaving(false)
    if (error) {
      setError(error.message)
      return
    }
    onCreated()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/40 px-3 py-4 sm:px-4 sm:py-8" onClick={onClose}>
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-sm border border-rule bg-paper shadow-xl"
      >
        <div className="flex items-center justify-between border-b border-rule px-4 py-3 sm:px-6 sm:py-4">
          <h2 className="font-display text-lg font-semibold text-ledger">Add company</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="close-btn">
            ×
          </button>
        </div>
        <div className="space-y-4 px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <label className="field-label" htmlFor="company-name">Company name</label>
            <input
              id="company-name"
              className="field-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
          <div>
            <label className="field-label" htmlFor="company-number">Company number</label>
            <input
              id="company-number"
              className="field-input font-mono"
              value={number}
              onChange={(e) => setNumber(e.target.value)}
              placeholder="e.g. 12345678"
            />
          </div>
          {error && <p className="text-sm text-redact">{error}</p>}
          <p className="text-xs text-ink/50">
            You can add directors, PSC and shareholders after saving.
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-rule px-4 py-3 sm:px-6 sm:py-4">
          <button type="button" className="btn-secondary" onClick={onClose}>
            Cancel
          </button>
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Add company'}
          </button>
        </div>
      </form>
    </div>
  )
}
