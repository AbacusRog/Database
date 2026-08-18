import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { CompanyList } from './components/CompanyList'
import { CompanyDetail } from './components/CompanyDetail'
import { PersonDetail } from './components/PersonDetail'
import { RelationshipGraph } from './components/RelationshipGraph'
import { DueDatesPage } from './components/DueDatesPage'
import { AddCompanyForm } from './components/AddCompanyForm'
import { LoginPanel } from './components/LoginPanel'
import { ManageAccessPage } from './components/ManageAccessPage'
import { useAuth } from './hooks/useAuth'
import { useCompanies, matchesSearch } from './hooks/useCompanies'
import { useIsAdmin } from './hooks/useIsAdmin'
import { buildPersonIndex } from './lib/relationships'

function SignInGate() {
  const [showLogin, setShowLogin] = useState(false)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-paper px-4 text-center">
      <p className="text-xs uppercase tracking-[0.2em] text-brass">Group corporate record</p>
      <h1 className="mt-1 font-display text-3xl font-semibold text-ledger sm:text-4xl">Company Register</h1>
      <p className="mt-3 max-w-sm text-sm text-ink/60">
        This register is private. Sign in to view companies, directors, PSC, and shareholders.
      </p>
      <button type="button" className="btn-primary mt-6" onClick={() => setShowLogin(true)}>
        Sign in
      </button>
      {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
    </div>
  )
}

export default function App() {
  const { isAuthenticated, loading: authLoading, signOut } = useAuth()
  const { companies, loading, error, refresh } = useCompanies(isAuthenticated)
  const { isAdmin } = useIsAdmin(isAuthenticated)

  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showGraph, setShowGraph] = useState(false)
  const [showDueDates, setShowDueDates] = useState(true)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showManageAccess, setShowManageAccess] = useState(false)

  const filtered = useMemo(
    () => companies.filter((c) => matchesSearch(c, search)),
    [companies, search]
  )

  const personIndex = useMemo(() => buildPersonIndex(companies), [companies])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)
  const selectedPerson = selectedPersonId ? personIndex.get(selectedPersonId) : undefined

  function openCompany(id: string) {
    setSelectedPersonId(null)
    setSelectedCompanyId(id)
  }

  function openPerson(id: string) {
    setSelectedCompanyId(null)
    setSelectedPersonId(id)
  }

  // Avoid flashing the sign-in gate for the brief moment auth state is
  // still being read from storage on first load.
  if (authLoading) {
    return <div className="min-h-screen bg-paper" />
  }

  if (!isAuthenticated) {
    return <SignInGate />
  }

  return (
    <div className="min-h-screen bg-paper">
      <Header
        companyCount={companies.length}
        peopleCount={personIndex.size}
        search={search}
        onSearchChange={setSearch}
        isAdmin={isAdmin}
        onSignOutClick={signOut}
        onAddCompanyClick={() => setShowAddForm(true)}
        onShowGraphClick={() => setShowGraph(true)}
        onShowDueDatesClick={() => setShowDueDates(true)}
        onShowManageAccessClick={() => setShowManageAccess(true)}
      />

      <main className="mx-auto max-w-4xl px-4 py-6 sm:px-6">
        {loading && <p className="py-10 text-center text-sm text-ink/50">Loading register…</p>}
        {error && (
          <p className="py-10 text-center text-sm text-redact">
            Could not load the register: {error}
          </p>
        )}
        {!loading && !error && (
          <CompanyList
            companies={filtered}
            onSelectCompany={(c) => openCompany(c.id)}
            onSelectPerson={openPerson}
          />
        )}
      </main>

      {showGraph && (
        <RelationshipGraph
          companies={companies}
          personIndex={personIndex}
          onClose={() => setShowGraph(false)}
          onSelectCompany={openCompany}
          onSelectPerson={openPerson}
        />
      )}

      {showDueDates && (
        <DueDatesPage
          companies={companies}
          loading={loading}
          onClose={() => setShowDueDates(false)}
          onSelectCompany={(id) => {
            setShowDueDates(false)
            openCompany(id)
          }}
        />
      )}

      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          editable={isAuthenticated}
          isAdmin={isAdmin}
          onChange={refresh}
          onClose={() => setSelectedCompanyId(null)}
          onDeleted={() => {
            setSelectedCompanyId(null)
            refresh()
          }}
          onSelectPerson={openPerson}
        />
      )}

      {showManageAccess && <ManageAccessPage onClose={() => setShowManageAccess(false)} />}

      {selectedPerson && (
        <PersonDetail
          entry={selectedPerson}
          editable={isAuthenticated}
          onChange={refresh}
          onClose={() => setSelectedPersonId(null)}
          onSelectCompany={openCompany}
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
    </div>
  )
}
