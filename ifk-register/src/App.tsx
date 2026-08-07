import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { CompanyList } from './components/CompanyList'
import { CompanyDetail } from './components/CompanyDetail'
import { AddCompanyForm } from './components/AddCompanyForm'
import { LoginPanel } from './components/LoginPanel'
import { useAuth } from './hooks/useAuth'
import { useCompanies, matchesSearch } from './hooks/useCompanies'
import type { CompanyWithRoles } from './types'

export default function App() {
  const { isAuthenticated, signOut } = useAuth()
  const { companies, loading, error, refresh } = useCompanies()

  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

  const filtered = useMemo(
    () => companies.filter((c) => matchesSearch(c, search)),
    [companies, search]
  )

  const peopleCount = useMemo(() => {
    const ids = new Set<string>()
    companies.forEach((c) => {
      c.directors.forEach((d) => ids.add(d.person_id))
      c.pscs.forEach((d) => ids.add(d.person_id))
      c.shareholders.forEach((d) => ids.add(d.person_id))
    })
    return ids.size
  }, [companies])

  const selected: CompanyWithRoles | undefined = companies.find((c) => c.id === selectedId)

  return (
    <div className="min-h-screen bg-paper">
      <Header
        companyCount={companies.length}
        peopleCount={peopleCount}
        search={search}
        onSearchChange={setSearch}
        isAuthenticated={isAuthenticated}
        onSignInClick={() => setShowLogin(true)}
        onSignOutClick={signOut}
        onAddCompanyClick={() => setShowAddForm(true)}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {loading && <p className="py-10 text-center text-sm text-ink/50">Loading register…</p>}
        {error && (
          <p className="py-10 text-center text-sm text-redact">
            Could not load the register: {error}
          </p>
        )}
        {!loading && !error && <CompanyList companies={filtered} onSelect={(c) => setSelectedId(c.id)} />}
      </main>

      {selected && (
        <CompanyDetail
          company={selected}
          editable={isAuthenticated}
          onChange={refresh}
          onClose={() => setSelectedId(null)}
          onDeleted={() => {
            setSelectedId(null)
            refresh()
          }}
        />
      )}

      {showAddForm && (
        <AddCompanyForm
          onClose={() => setShowAddForm(false)}
          onCreated={() => {
            setShowAddForm(false)
            refresh()
          }}
        />
      )}

      {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
    </div>
  )
}
