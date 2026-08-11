import type { CompanyWithRoles, RoleLink } from '../types'

interface Props {
  companies: CompanyWithRoles[]
  onSelectCompany: (company: CompanyWithRoles) => void
  onSelectPerson: (personId: string) => void
}

function NameList({
  links,
  emptyLabel,
  onSelectPerson,
}: {
  links: RoleLink[]
  emptyLabel: string
  onSelectPerson: (personId: string) => void
}) {
  if (links.length === 0) return <span className="text-ink/40">{emptyLabel}</span>
  return (
    <>
      {links.map((l, i) => (
        <span key={l.id}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onSelectPerson(l.person_id)
            }}
            className="underline decoration-dotted decoration-ink/30 hover:decoration-ledger hover:text-ledger"
          >
            {l.person.full_name}
          </button>
          {i < links.length - 1 && ', '}
        </span>
      ))}
    </>
  )
}

export function CompanyList({ companies, onSelectCompany, onSelectPerson }: Props) {
  if (companies.length === 0) {
    return (
      <div className="border-t border-rule py-16 text-center">
        <p className="font-display text-lg text-ink/60">No entries match.</p>
        <p className="mt-1 text-sm text-ink/40">Try a different company or person name.</p>
      </div>
    )
  }

  return (
    <ol className="border-t border-rule">
      {companies.map((company, i) => (
        <li key={company.id} className="ledger-rule">
          <div
            role="button"
            tabIndex={0}
            onClick={() => onSelectCompany(company)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onSelectCompany(company)
              }
            }}
            className="group grid w-full cursor-pointer grid-cols-[2.5rem_1fr] gap-x-4 gap-y-2 px-2 py-4 text-left transition-colors hover:bg-ledger/[0.03] sm:grid-cols-[2.5rem_1.5fr_1fr] sm:gap-y-1"
          >
            <span className="font-mono text-xs text-ink/30 pt-1">{String(i + 1).padStart(2, '0')}</span>

            <div>
              <div className="flex flex-wrap items-baseline gap-x-3">
                <h3 className="font-display text-lg font-medium text-ledger group-hover:underline">
                  {company.name}
                </h3>
                <span className="seal border-brass/50 px-1.5 py-0.5 text-[10px]">
                  {company.company_number ?? 'no. —'}
                </span>
              </div>
              <p className="mt-1 text-sm text-ink/60">
                <span className="text-ink/40">Directors: </span>
                <NameList links={company.directors} emptyLabel="—" onSelectPerson={onSelectPerson} />
              </p>
            </div>

            <div className="col-span-2 space-y-1 pl-[2.5rem] text-sm text-ink/60 sm:col-span-1 sm:space-y-0.5 sm:pl-0 sm:text-right sm:text-xs">
              <p>
                <span className="text-ink/40">PSC — </span>
                <NameList links={company.pscs} emptyLabel="—" onSelectPerson={onSelectPerson} />
              </p>
              <p>
                <span className="text-ink/40">Shareholders — </span>
                <NameList links={company.shareholders} emptyLabel="—" onSelectPerson={onSelectPerson} />
              </p>
            </div>
          </div>
        </li>
      ))}
    </ol>
  )
}
