interface Props {
  companyCount: number
  peopleCount: number
  search: string
  onSearchChange: (value: string) => void
  isAuthenticated: boolean
  onSignInClick: () => void
  onSignOutClick: () => void
  onAddCompanyClick: () => void
}

export function Header({
  companyCount,
  peopleCount,
  search,
  onSearchChange,
  isAuthenticated,
  onSignInClick,
  onSignOutClick,
  onAddCompanyClick,
}: Props) {
  return (
    <header className="border-b border-rule bg-paper">
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="flex items-start justify-between gap-4">
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
          <div className="flex shrink-0 flex-col items-end gap-2">
            {isAuthenticated ? (
              <button type="button" className="btn-secondary text-xs" onClick={onSignOutClick}>
                Sign out
              </button>
            ) : (
              <button type="button" className="btn-secondary text-xs" onClick={onSignInClick}>
                Sign in to edit
              </button>
            )}
            {isAuthenticated && (
              <button type="button" className="btn-primary text-xs" onClick={onAddCompanyClick}>
                Add company
              </button>
            )}
          </div>
        </div>

        <div className="mt-6">
          <input
            type="search"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search by company name or director…"
            aria-label="Search companies and directors"
            className="w-full rounded-sm border border-ink/20 bg-white/70 px-4 py-3 text-sm placeholder:text-ink/40 focus:border-brass"
          />
        </div>
      </div>
    </header>
  )
}
