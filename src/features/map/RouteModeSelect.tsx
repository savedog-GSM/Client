import { useEffect, useId, useRef, useState } from 'react'
import { Check, ChevronDown } from 'lucide-react'
import type { PathMode } from '../../api/types'

const options: { value: PathMode; label: string; description: string }[] = [
  { value: 'SAFEST', label: '안전 우선', description: '위험 구간을 피해 이동해요' },
  { value: 'SHORTEST', label: '최단 거리', description: '이동 거리가 짧은 길을 찾아요' },
]

export default function RouteModeSelect({
  value,
  onChange,
}: {
  value: PathMode
  onChange: (value: PathMode) => void
}) {
  const id = useId()
  const container = useRef<HTMLDivElement>(null)
  const trigger = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const selected = options.findIndex((option) => option.value === value)
  useEffect(() => {
    if (!open) return
    const closeOutside = (event: PointerEvent) => {
      if (!container.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', closeOutside)
    return () => document.removeEventListener('pointerdown', closeOutside)
  }, [open])
  function choose(index: number) {
    onChange(options[index].value)
    setOpen(false)
    trigger.current?.focus()
  }
  return (
    <div
      className="route-mode"
      ref={container}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false)
      }}
    >
      <span id={`${id}-label`} className="route-mode-label">
        탐색 방식
      </span>
      <button
        ref={trigger}
        type="button"
        role="combobox"
        className="route-mode-trigger"
        aria-labelledby={`${id}-label`}
        aria-expanded={open}
        aria-haspopup="listbox"
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${active}` : undefined}
        onClick={() => {
          setActive(selected)
          setOpen(!open)
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault()
            setOpen(true)
            setActive(
              open
                ? (active + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length
                : selected,
            )
          } else if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            if (open) choose(active)
            else {
              setActive(selected)
              setOpen(true)
            }
          } else if (open && (event.key === 'Home' || event.key === 'End')) {
            event.preventDefault()
            setActive(event.key === 'Home' ? 0 : options.length - 1)
          } else if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
          } else if (event.key === 'Tab') setOpen(false)
        }}
      >
        <span>{options[selected].label}</span>
        <ChevronDown size={18} aria-hidden="true" className={open ? 'is-open' : ''} />
      </button>
      {open && (
        <div
          id={`${id}-options`}
          role="listbox"
          aria-labelledby={`${id}-label`}
          className="route-mode-options"
        >
          {options.map((option, index) => (
            <button
              type="button"
              role="option"
              key={option.value}
              id={`${id}-option-${index}`}
              aria-selected={value === option.value}
              tabIndex={-1}
              className={active === index ? 'is-active' : ''}
              onPointerMove={() => setActive(index)}
              onClick={() => choose(index)}
            >
              <span>
                <strong>{option.label}</strong>
                <small>{option.description}</small>
              </span>
              {value === option.value && <Check size={17} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
