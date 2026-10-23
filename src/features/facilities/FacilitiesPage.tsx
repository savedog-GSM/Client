import { useEffect, useMemo, useRef, useState } from 'react'
import { Store, Toilet, MapPin, ArrowRight, X } from 'lucide-react'
import { errorMessage } from '../../api/client'
import type { ConnectionSettings } from '../../api/types'
import { ErrorNotice } from '../../components/ui'
import SafetyMap from '../map/SafetyMap'
import { demoPosition } from '../demo/session'
import { createFacilitiesApi } from './api'
import { demoFacilityRoute } from './demo'
import {
  facilityNames,
  type FacilityCategory,
  type FacilityOrigin,
  type FacilityRoute,
} from './types'
import './facilities.css'

const ignore = () => {}
const categories = [
  { category: 'TOILET', icon: Toilet, description: '가장 가까운 화장실 경로 찾기' },
  { category: 'CONVENIENCE_STORE', icon: Store, description: '가장 가까운 편의점 경로 찾기' },
] as const

function locate(): Promise<FacilityOrigin> {
  if (!window.isSecureContext)
    return Promise.reject(new Error('위치 확인을 위해 HTTPS 주소로 접속해주세요.'))
  if (!navigator.geolocation)
    return Promise.reject(new Error('이 브라우저에서는 현재 위치를 확인할 수 없습니다.'))
  return new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        if (!Number.isFinite(coords.accuracy) || coords.accuracy > 100) {
          reject(
            new Error(
              '현재 위치의 오차가 큽니다. 스마트폰에서 위치 정확도를 높인 뒤 다시 선택해주세요.',
            ),
          )
          return
        }
        resolve({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
        })
      },
      (error) =>
        reject(
          new Error(
            error.code === 1
              ? '위치 권한이 꺼져 있습니다. 브라우저 설정에서 위치를 허용한 뒤 다시 선택해주세요.'
              : '현재 위치를 확인하지 못했습니다. 잠시 후 다시 선택해주세요.',
          ),
        ),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 15000 },
    ),
  )
}

export default function FacilitiesPage({
  settings,
  simulated = false,
}: {
  settings: ConnectionSettings
  simulated?: boolean
}) {
  const api = useMemo(() => createFacilitiesApi(settings), [settings])
  const request = useRef<AbortController | null>(null)
  const heading = useRef<HTMLHeadingElement>(null)
  const [category, setCategory] = useState<FacilityCategory | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ origin: FacilityOrigin; data: FacilityRoute } | null>(null)
  const [mapOpen, setMapOpen] = useState(false)
  useEffect(() => {
    setResult(null)
    setPending(false)
    setCategory(null)
    setError('')
    setMessage('')
    return () => request.current?.abort()
  }, [api, simulated])
  useEffect(() => {
    if (result) heading.current?.focus()
  }, [result])

  async function search(next: FacilityCategory) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setCategory(next)
    setResult(null)
    setMapOpen(false)
    setError('')
    setPending(true)
    setMessage(simulated ? '시연용 경로를 준비하고 있습니다.' : '현재 위치를 확인하고 있습니다.')
    try {
      const origin = simulated ? { ...demoPosition, accuracy: 3 } : await locate()
      if (controller.signal.aborted) return
      setMessage(`가까운 ${facilityNames[next]}과 보행 경로를 찾고 있습니다.`)
      const data = simulated
        ? demoFacilityRoute(next)
        : await api.nearestRoute(next, origin, controller.signal)
      if (controller.signal.aborted) return
      setResult({ origin, data })
      setMessage(`${data.facility.name}까지의 ${simulated ? '시연용 ' : ''}경로를 찾았습니다.`)
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage('')
        setError(errorMessage(error))
      }
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }
  function cancel() {
    request.current?.abort()
    setPending(false)
    setMessage('검색을 취소했습니다. 이용할 시설을 다시 선택해주세요.')
  }
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
      <div className="facility-buttons" role="group" aria-label="찾을 편의시설">
        {categories.map(({ category: value, icon: Icon, description }) => (
          <button
            key={value}
            className={`facility-button ${value === 'TOILET' ? 'toilet' : 'store'}`}
            aria-label={description}
            aria-pressed={category === value}
            disabled={pending && category === value}
            onClick={() => void search(value)}
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
      <p className="facility-status" role="status" aria-live="polite" aria-atomic="true">
        {message}
      </p>
      {pending && (
        <button className="facility-cancel" onClick={cancel}>
          <X size={20} aria-hidden="true" />
          검색 취소
        </button>
      )}
      <ErrorNotice message={error} />
      {result && (
        <section className="facility-result" aria-labelledby="facility-result-title">
          <span className="facility-result-label">
            <MapPin size={18} aria-hidden="true" />
            {simulated ? '시연용 안내' : '가까운 편의시설'}
          </span>
          <h2 id="facility-result-title" tabIndex={-1} ref={heading}>
            {result.data.facility.name}
          </h2>
          <p className="facility-address">
            {result.data.facility.address || '주소 정보가 없습니다.'}
          </p>
          <dl className="facility-distance">
            <div>
              <dt>걸어가는 거리</dt>
              <dd>약 {Math.round(result.data.route.distanceMeters).toLocaleString('ko-KR')}m</dd>
            </div>
            <div>
              <dt>예상 시간</dt>
              <dd>
                {result.data.route.durationSeconds === 0
                  ? '도착 위치'
                  : `약 ${Math.ceil(result.data.route.durationSeconds / 60)}분`}
              </dd>
            </div>
          </dl>
          {simulated && (
            <p className="facility-demo-note">실제 시설이나 보행 경로가 아닌 시연용 예시입니다.</p>
          )}
          <h3>이동 경로</h3>
          <ol className="facility-steps">
            {result.data.route.steps.map((step, index) => (
              <li key={index}>
                <span>{step.instruction}</span>
                <small>{Math.round(step.distanceMeters)}m</small>
              </li>
            ))}
          </ol>
          <details
            className="facility-map"
            onToggle={(event) => setMapOpen(event.currentTarget.open)}
          >
            <summary>지도로 경로 보기</summary>
            {mapOpen && (
              <SafetyMap
                currentPosition={result.origin}
                positionAccuracy={result.origin.accuracy}
                position={null}
                start={result.origin}
                end={result.data.facility}
                route={result.data.route}
                segments={[]}
                reports={[]}
                records={[]}
                onSelect={ignore}
                onBounds={ignore}
              />
            )}
          </details>
          <p className="facility-route-note">
            이 화면은 경로 조회입니다. 이동 중 위치에 따른 실시간 회전·도착 안내는 제공하지
            않습니다.
          </p>
        </section>
      )}
    </div>
  )
}
