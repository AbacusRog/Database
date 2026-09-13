import { useMemo, useState } from 'react'
import type { Person } from '../types'

interface Props {
  people: Person[]
  excludeIds: string[]
  onPick: (name: string) => void
  placeholder?: string
}

/** Text input with a dropdown of matching existing people; typing a name
 *  that doesn't exist yet and confirming will create a new person. */
export function PersonPicker({ people, excludeIds, onPick, placeholder }: Props) {
  const [value, setValue] = useState('')
  const [open, setOpen] = useState(false)

  const suggestions = useMemo(() => {
    const q = value.trim().toLowerCase()
    return people
      .filter((p) => !excludeIds.includes(p.id))
      .filter((p) => (q ? p.full_name.toLowerCase().includes(q) : true))
      .slice(0, 6)
  }, [people, excludeIds, value])

  function commit(name: string) {
    if (!name.trim()) return
    onPick(name.trim())
    setValue('')
    setOpen(false)
  }

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          className="field-input"
          value={value}
          placeholder={placeholder ?? 'Search or add a person…'}
          onChange={(e) => {
            setValue(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              commit(value)
            }
            if (e.key === 'Escape') setOpen(false)
          }}
        />
        <button type="button" className="btn-secondary shrink-0" onClick={() => commit(value)}>
          Add
        </button>
      </div>
      {open && value.trim() && suggestions.length > 0 && (
        <ul className="absolute z-10 mt-1 w-full max-h-48 overflow-auto rounded-sm border border-ink/15 bg-white shadow-md">
          {suggestions.map((p) => (
            <li key={p.id}>
              <button
                type="button"
                className="block w-full px-3 py-2 text-left text-sm hover:bg-paper"
                onClick={() => commit(p.full_name)}
              >
                {p.full_name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
