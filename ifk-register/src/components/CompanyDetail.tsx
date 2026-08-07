import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { usePeople } from '../hooks/usePeople'
import { RoleEditor } from './RoleEditor'
import type { CompanyWithRoles } from '../types'

interface Props {
  company: CompanyWithRoles
  editable: boolean
  onChange: () => void
  onClose: () => void
  onDeleted: () => void
}

export function CompanyDetail({ company, editable, onChange, onClose, onDeleted }: Props) {
  const { people, findOrCreate } = usePeople()
  const [name, setName] = useState(company.name)
  const [number, setNumber] = useState(company.company_number ?? '')
  const [savingField, setSavingField] = useState<'name' | 'number' | null>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function saveField(field: 'name' | 'company_number', value: string) {
    setSavingField(field === 'name' ? 'name' : 'number')
    const { error } = await supabase
      .from('companies')
      .update({ [field]: value.trim() || null })
      .eq('id', company.id)
    if (error) console.error(error)
    onChange()
    setSavingField(null)
  }

  async function deleteCompany() {
    const { error } = await supabase.from('companies').delete().eq('id', company.id)
    if (error) {
      console.error(error)
      return
    }
    onDeleted()
  }

  return (
    <div
      className="fixed inset-0 z-30 flex items-start justify-center overflow-y-auto bg-ink/40 px-4 py-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-sm border border-rule bg-paper shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between border-b border-rule px-6 py-5">
          <div className="flex-1">
            {editable ? (
              <input
                className="w-full bg-transparent font-display text-2xl font-semibold text-ledger focus:outline-none focus:border-b focus:border-brass"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={() => name.trim() && name !== company.name && saveField('name', name)}
              />
            ) : (
              <h2 className="font-display text-2xl font-semibold text-ledger">{company.name}</h2>
            )}
            <div className="mt-1 flex items-center gap-2">
              <span className="text-xs uppercase tracking-wide text-ink/50">Company no.</span>
              {editable ? (
                <input
                  className="seal border-brass/60 px-2 py-0.5 bg-transparent"
                  value={number}
                  placeholder="—"
                  onChange={(e) => setNumber(e.target.value)}
                  onBlur={() =>
                    number !== (company.company_number ?? '') && saveField('company_number', number)
                  }
                />
              ) : (
                <span className="seal border-brass/60 px-2 py-0.5">{company.company_number ?? '—'}</span>
              )}
              {savingField && <span className="text-xs text-ink/40">saving…</span>}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink/50 hover:text-ink text-xl leading-none px-1"
          >
            ×
          </button>
        </div>

        <div className="grid gap-6 px-6 py-6 sm:grid-cols-3">
          <RoleEditor
            companyId={company.id}
            role="director"
            links={company.directors}
            editable={editable}
            onChange={onChange}
            people={people}
            findOrCreate={findOrCreate}
          />
          <RoleEditor
            companyId={company.id}
            role="psc"
            links={company.pscs}
            editable={editable}
            onChange={onChange}
            people={people}
            findOrCreate={findOrCreate}
          />
          <RoleEditor
            companyId={company.id}
            role="shareholder"
            links={company.shareholders}
            editable={editable}
            onChange={onChange}
            people={people}
            findOrCreate={findOrCreate}
          />
        </div>

        {editable && (
          <div className="border-t border-rule px-6 py-4">
            {confirmingDelete ? (
              <div className="flex items-center gap-3 text-sm">
                <span className="text-ink/70">Delete {company.name} and all its records?</span>
                <button type="button" className="btn-danger" onClick={deleteCompany}>
                  Confirm delete
                </button>
                <button type="button" className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
                  Cancel
                </button>
              </div>
            ) : (
              <button type="button" className="btn-danger text-xs" onClick={() => setConfirmingDelete(true)}>
                Delete company
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
