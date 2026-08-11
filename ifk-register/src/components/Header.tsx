interface Props {
  companyCount: number
  peopleCount: number
  search: string
  onSearchChange: (value: string) => void
  onSignOutClick: () => void
  onAddCompanyClick: () => void
  onShowGraphClick: () => void
  onShowDueDatesClick: () => void
}

export function Header({
  companyCount,
  peopleCount,
  search,
  onSearchChange,
  onSignOutClick,
  onAddCompanyClick,
  onShowGraphClick,
  onShowDueDatesClick,
}: Props) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 sm:py-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-brass">Group corporate record</p>
            <h1 className="mt-1 font-display text-3xl font-semibold text-ledger sm:text-4xl">
              Company Register
            </h1>
            <p className="mt-2 max-w-md text-sm text-ink/60">
              Directors, persons with significant control and shareholdings across{' '}
              <span className="font-mono">{companyCount}</span> compan{companyCount === 1 ? 'y' : 'ies'} and{' '}
              <span className="font-mono">{peopleCount}</span> named individual{peopleCount === 1 ? '' : 's'}.
            </p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:shrink-0 sm:items-end">
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-secondary text-xs" onClick={onShowDueDatesClick}>
                Due dates
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={onShowGraphClick}>
                Relationship map
              </button>
              <button type="button" className="btn-secondary text-xs" onClick={onSignOutClick}>
                Sign out
              </button>
            </div>
            <button type="button" className="btn-primary text-xs" onClick={onAddCompanyClick}>
              Add company
            </button>
          </div>
        </div>

        <div className="mt-6">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by company name or director…"
            aria-label="Search companies and directors"
            className="w-full rounded-sm border border-ink/20 bg-white/70 px-4 py-3 text-base placeholder:text-ink/40 focus:border-brass sm:text-sm"
          />
        </div>
      </div>
    </header>
  )
}
