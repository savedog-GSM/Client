import { Store, Toilet, ArrowRight, X } from 'lucide-react'
import type { ConnectionSettings } from '../../api/types'
import { ErrorNotice } from '../../components/ui'
import { useVoiceGuide } from '../../components/useVoiceGuide'
import { facilityNames } from './types'
import { useFacilityRoute } from './useFacilityRoute'
import FacilityRouteResult from './FacilityRouteResult'
import './facilities.css'

const categories = [
  { category: 'TOILET', icon: Toilet, description: '가장 가까운 화장실 경로 찾기' },
  { category: 'CONVENIENCE_STORE', icon: Store, description: '가장 가까운 편의점 경로 찾기' },
] as const

export default function FacilitiesPage({
  settings,
  simulated = false,
}: {
  settings: ConnectionSettings
  simulated?: boolean
}) {
  const voice = useVoiceGuide()
  const { category, pending, message, error, result, search, cancel } = useFacilityRoute(
    settings,
    simulated,
  )
  return (
    <div className="facilities-page">
      <header className="facilities-title">
        <span>스마트폰 길 안내</span>
        <h1>어디로 갈까요?</h1>
        <p>
          이용할 시설을 선택하면 가까운 곳까지
          <br />
          걸어가는 경로를 확인할 수 있어요.
        </p>
      </header>
      {voice.error && (
        <p className="facility-sound-error" role="status" aria-label="음성 안내 상태">
          {voice.error}
        </p>
      )}
      <div className="facility-buttons" role="group" aria-label="찾을 편의시설">
        {categories.map(({ category: value, icon: Icon, description }) => (
          <button
            key={value}
            className={`facility-button ${value === 'TOILET' ? 'toilet' : 'store'}`}
            aria-label={description}
            aria-pressed={category === value}
            disabled={pending && category === value}
            onClick={() => {
              voice.speak(facilityNames[value])
              void search(value)
            }}
          >
            <Icon size={42} aria-hidden="true" />
            <span>
              <strong>{facilityNames[value]}</strong>
              <small>{description}</small>
            </span>
            <ArrowRight size={24} aria-hidden="true" />
          </button>
        ))}
      </div>
      <p
        className="facility-status"
        role="status"
        aria-label="검색 상태"
        aria-live="polite"
        aria-atomic="true"
      >
        {message}
      </p>
      {pending && (
        <button className="facility-cancel" onClick={cancel}>
          <X size={20} aria-hidden="true" />
          검색 취소
        </button>
      )}
      <ErrorNotice message={error} />
      {result && <FacilityRouteResult result={result} simulated={simulated} />}
    </div>
  )
}
