import { useEffect, useId, useRef, useState } from 'react'
import { Search } from 'lucide-react'
import { errorMessage } from '../../api/client'
import { searchLocations, type LocationResult } from './searchLocations'

interface Props {
  label: string
  value: string
  onChange: (value: string) => void
  onSelect: (location: LocationResult) => void
}

export default function AddressSearch({ label, value, onChange, onSelect }: Props) {
  const id = useId()
  const request = useRef<symbol | null>(null)
  const [results, setResults] = useState<LocationResult[]>([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  useEffect(() => {
    request.current = null
    setResults([])
    setLoading(false)
    setMessage('')
    return () => {
      request.current = null
    }
  }, [value])
  async function search() {
    if (!value.trim()) return
    const current = Symbol()
    request.current = current
    setLoading(true)
    setMessage('')
    setResults([])
    try {
      const found = await searchLocations(value.trim())
      if (current !== request.current) return
      setResults(found)
      if (!found.length) setMessage('검색 결과가 없습니다. 주소나 장소명을 확인해주세요.')
    } catch (error) {
      if (current === request.current) setMessage(errorMessage(error))
    } finally {
      if (current === request.current) setLoading(false)
    }
  }
  return (
    <div className="address-search">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          void search()
        }}
      >
        <label htmlFor={id}>{label}</label>
        <div className="address-input">
          <input
            id={id}
            value={value}
            placeholder="주소 또는 장소명 검색"
            onChange={(event) => onChange(event.target.value)}
            autoComplete="off"
          />
          <button type="submit" aria-label={`${label} 검색`} disabled={loading || !value.trim()}>
            <Search size={17} aria-hidden="true" />
          </button>
        </div>
      </form>
      {(loading || message) && (
        <p className="muted" role="status">
          {loading ? '검색 중입니다.' : message}
        </p>
      )}
      {!!results.length && (
        <ul className="address-results" aria-label={`${label} 검색 결과`}>
          {results.map((result, index) => (
            <li key={`${result.name}-${index}`}>
              <button
                type="button"
                onClick={() => {
                  request.current = null
                  setResults([])
                  onSelect(result)
                }}
              >
                <strong>{result.name}</strong>
                <small>{result.address}</small>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
