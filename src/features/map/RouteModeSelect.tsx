import { useId } from 'react'
import type { PathMode } from '../../api/types'

const options: { value: PathMode; label: string; description: string }[] = [
  { value: 'SAFEST', label: '안전 우선', description: '위험 구간을 피해 이동해요' },
  { value: 'SHORTEST', label: '최단 거리', description: '도보 이동 거리가 짧은 길을 찾아요' },
]

export default function RouteModeSelect({
  value,
  onChange,
}: {
  value: PathMode
  onChange: (value: PathMode) => void
}) {
  const id = useId()

  return (
    <fieldset className="route-mode">
      <legend id={`${id}-label`} className="route-mode-label">
        길찾기 종류
      </legend>
      <div className="route-mode-options" aria-labelledby={`${id}-label`}>
        {options.map((option) => (
          <label key={option.value}>
            <input
              type="radio"
              name={id}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
            />
            <span>
              <strong>{option.label}</strong>
              <small>{option.description}</small>
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  )
}
