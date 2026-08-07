import type { CompanyWithRoles } from '../types'

interface Props {
  companies: CompanyWithRoles[]
  onSelect: (company: CompanyWithRoles) => void
}

function namesOf(links: { person: { full_name: string } }[]): string {
  if (links.length === 0) return '—'
  return links.map((l) => l.person.full_name).join(', ')
}

export function CompanyList({ companies, onSelect }: Props) {
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
          <button
            type="button"
            onClick={() => onSelect(company)}
            className="group grid w-full grid-cols-[2.5rem_1fr] gap-x-4 gap-y-1 px-2 py-4 text-left transition-colors hover:bg-ledger/[0.03] sm:grid-cols-[2.5rem_1.5fr_1fr]"
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
                <span className="text-ink/40">Directors:</span> {namesOf(company.directors)}
              </p>
            </div>

            <div className="mt-1 grid grid-cols-2 gap-2 text-xs text-ink/60 sm:mt-0 sm:block sm:text-right">
              <p>
                <span className="text-ink/40">PSC — </span>
                {namesOf(company.pscs)}
              </p>
              <p className="mt-0.5">
                <span className="text-ink/40">Shareholders — </span>
                {namesOf(company.shareholders)}
              </p>
            </div>
          </button>
        </li>
      ))}
    </ol>
  )
}
