import { useMemo, useState } from 'react'
import { Header } from './components/Header'
import { CompanyList } from './components/CompanyList'
import { CompanyDetail } from './components/CompanyDetail'
import { PersonDetail } from './components/PersonDetail'
import { RelationshipGraph } from './components/RelationshipGraph'
import { AddCompanyForm } from './components/AddCompanyForm'
import { LoginPanel } from './components/LoginPanel'
import { useAuth } from './hooks/useAuth'
import { useCompanies, matchesSearch } from './hooks/useCompanies'
import { buildPersonIndex } from './lib/relationships'

export default function App() {
  const { isAuthenticated, signOut } = useAuth()
  const { companies, loading, error, refresh } = useCompanies()

  const [search, setSearch] = useState('')
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
  const [showGraph, setShowGraph] = useState(false)
  const [showAddForm, setShowAddForm] = useState(false)
  const [showLogin, setShowLogin] = useState(false)

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

  return (
    <div className="min-h-screen bg-paper">
      <Header
        companyCount={companies.length}
        peopleCount={personIndex.size}
        search={search}
        onSearchChange={setSearch}
        isAuthenticated={isAuthenticated}
        onSignInClick={() => setShowLogin(true)}
        onSignOutClick={signOut}
        onAddCompanyClick={() => setShowAddForm(true)}
        onShowGraphClick={() => setShowGraph(true)}
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

      {selectedCompany && (
        <CompanyDetail
          company={selectedCompany}
          editable={isAuthenticated}
          onChange={refresh}
          onClose={() => setSelectedCompanyId(null)}
          onDeleted={() => {
            setSelectedCompanyId(null)
            refresh()
          }}
          onSelectPerson={openPerson}
        />
      )}

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

      {showLogin && <LoginPanel onClose={() => setShowLogin(false)} />}
    </div>
  )
}
