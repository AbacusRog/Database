import { useMemo, useState } from 'react'
import type { CompanyWithRoles, PersonWithRoles, RoleKind } from '../types'

interface Props {
  companies: CompanyWithRoles[]
  personIndex: Map<string, PersonWithRoles>
  onClose: () => void
  onSelectCompany: (companyId: string) => void
  onSelectPerson: (personId: string) => void
}

const ROLE_COLOR: Record<RoleKind, string> = {
  director: '#16332B',
  psc: '#B08D45',
  shareholder: '#3B5F73',
}
const ROLE_LABEL: Record<RoleKind, string> = {
  director: 'Director',
  psc: 'PSC',
  shareholder: 'Shareholder',
}

type Hover = { kind: 'company' | 'person'; id: string } | null

const ROW_H = 40
const PAD = 28
const WIDTH = 820
const LEFT_X = 210
const RIGHT_X = WIDTH - 210

export function RelationshipGraph({ companies, personIndex, onClose, onSelectCompany, onSelectPerson }: Props) {
  const [hover, setHover] = useState<Hover>(null)

  const people = useMemo(
    () => [...personIndex.values()].sort((a, b) => a.person.full_name.localeCompare(b.person.full_name)),
    [personIndex]
  )
  const sortedCompanies = useMemo(
    () => [...companies].sort((a, b) => a.name.localeCompare(b.name)),
    [companies]
  )

  const rows = Math.max(sortedCompanies.length, people.length, 1)
  const height = rows * ROW_H + PAD * 2

  function yFor(index: number, count: number) {
    if (count <= 1) return height / 2
    return PAD + ((index + 0.5) * (height - PAD * 2)) / count
  }

  const companyY = new Map(sortedCompanies.map((c, i) => [c.id, yFor(i, sortedCompanies.length)]))
  const personY = new Map(people.map((p, i) => [p.person.id, yFor(i, people.length)]))

  // Every edge: one per (company, role, person)
  type Edge = { companyId: string; personId: string; role: RoleKind }
  const edges: Edge[] = []
  for (const c of sortedCompanies) {
    for (const d of c.directors) edges.push({ companyId: c.id, personId: d.person_id, role: 'director' })
    for (const p of c.pscs) edges.push({ companyId: c.id, personId: p.person_id, role: 'psc' })
    for (const s of c.shareholders) edges.push({ companyId: c.id, personId: s.person_id, role: 'shareholder' })
  }

  function edgeActive(edge: Edge) {
    if (!hover) return true
    if (hover.kind === 'company') return edge.companyId === hover.id
    return edge.personId === hover.id
  }
  function companyActive(id: string) {
    if (!hover) return true
    if (hover.kind === 'company') return hover.id === id
    return edges.some((e) => e.companyId === id && e.personId === hover.id)
  }
  function personActive(id: string) {
    if (!hover) return true
    if (hover.kind === 'person') return hover.id === id
    return edges.some((e) => e.personId === id && e.companyId === hover.id)
  }

  const midX = (LEFT_X + RIGHT_X) / 2

  return (
    <div className="fixed inset-0 z-30 flex flex-col bg-paper">
      <div className="flex flex-col gap-3 border-b border-rule px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-brass">Group corporate record</p>
          <h2 className="font-display text-xl font-semibold text-ledger">Relationship map</h2>
        </div>
        <div className="flex items-center justify-between gap-3 sm:gap-5">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink/60">
            {(Object.keys(ROLE_LABEL) as RoleKind[]).map((role) => (
              <li key={role} className="flex items-center gap-1.5">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: ROLE_COLOR[role] }} />
                {ROLE_LABEL[role]}
              </li>
            ))}
          </ul>
          <button type="button" onClick={onClose} className="btn-secondary shrink-0 text-xs">
            Close
          </button>
        </div>
      </div>

      <p className="border-b border-rule bg-ledger/[0.03] px-4 py-2 text-center text-xs text-ink/50 sm:hidden">
        Scroll sideways to see the full diagram →
      </p>

      <div className="flex-1 overflow-auto px-4 py-6">
        <svg
          viewBox={`0 0 ${WIDTH} ${height}`}
          width={WIDTH}
          height={height}
          role="img"
          aria-label="Diagram connecting companies to their directors, PSC, and shareholders"
          style={{ maxWidth: 'none' }}
        >
          {edges.map((edge, i) => {
            const y1 = companyY.get(edge.companyId)
            const y2 = personY.get(edge.personId)
            if (y1 === undefined || y2 === undefined) return null
            const active = edgeActive(edge)
            return (
              <path
                key={i}
                d={`M ${LEFT_X} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${RIGHT_X} ${y2}`}
                fill="none"
                stroke={ROLE_COLOR[edge.role]}
                strokeWidth={active ? 1.6 : 1}
                opacity={active ? 0.75 : 0.08}
              />
            )
          })}

          {sortedCompanies.map((c, i) => {
            const y = companyY.get(c.id)!
            const active = companyActive(c.id)
            return (
              <g
                key={c.id}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ kind: 'company', id: c.id })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectCompany(c.id)}
                opacity={active ? 1 : 0.3}
              >
                <text
                  x={LEFT_X - 14}
                  y={y}
                  textAnchor="end"
                  dominantBaseline="middle"
                  className="font-display text-[13px] fill-ledger"
                  fontWeight={active ? 600 : 400}
                >
                  {c.name.length > 34 ? c.name.slice(0, 33) + '…' : c.name}
                </text>
                <circle cx={LEFT_X} cy={y} r={14} fill="transparent" />
                <circle cx={LEFT_X} cy={y} r={5} fill="#16332B" />
                {i === 0 && (
                  <text x={LEFT_X} y={PAD - 10} textAnchor="middle" className="fill-ink/40 text-[10px] uppercase tracking-wide">
                    Companies
                  </text>
                )}
              </g>
            )
          })}

          {people.map((p, i) => {
            const y = personY.get(p.person.id)!
            const active = personActive(p.person.id)
            return (
              <g
                key={p.person.id}
                className="cursor-pointer"
                onMouseEnter={() => setHover({ kind: 'person', id: p.person.id })}
                onMouseLeave={() => setHover(null)}
                onClick={() => onSelectPerson(p.person.id)}
                opacity={active ? 1 : 0.3}
              >
                <circle cx={RIGHT_X} cy={y} r={14} fill="transparent" />
                <circle cx={RIGHT_X} cy={y} r={5} fill="#B08D45" />
                <text
                  x={RIGHT_X + 14}
                  y={y}
                  textAnchor="start"
                  dominantBaseline="middle"
                  className="font-body text-[13px] fill-ink"
                  fontWeight={active ? 600 : 400}
                >
                  {p.person.full_name}
                </text>
                {i === 0 && (
                  <text x={RIGHT_X} y={PAD - 10} textAnchor="middle" className="fill-ink/40 text-[10px] uppercase tracking-wide">
                    People
                  </text>
                )}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
