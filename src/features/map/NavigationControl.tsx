import { useCallback, useEffect, useState } from 'react'
import { Navigation, Octagon } from 'lucide-react'
import type { Api } from '../../api/client'
import { errorMessage } from '../../api/client'
import type { NavigationResult, PathMode, Point } from '../../api/types'
import { number } from '../../components/ui'

const statusNames: Record<NavigationResult['status'], string> = {
  IDLE: '대기 중',
  WAITING_FOR_ROBOT_LOCATION: '로보독 위치 확인 중',
  FINDING_HEADING: '방향 확인 중',
  NAVIGATING: '이동 중',
  TURNING: '방향 전환 중',
  APPROACHING_BY_FACE: '주인에게 접근 중',
  BLOCKED_BY_OBSTACLE: '장애물로 대기 중',
  NO_SAFE_ROUTE: '안전 경로 없음',
  ROBOT_DISCONNECTED: '로보독 연결 끊김',
  ARRIVED: '도착 완료',
  GAVE_UP: '이동 종료',
}

export default function NavigationControl({
  api,
  target,
  mode,
}: {
  api: Api
  target: Point | null
  mode: PathMode
}) {
  const [state, setState] = useState<NavigationResult | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      try {
        const next = await api.navigation(signal)
        if (!signal?.aborted) {
          setState(next)
          setError('')
        }
      } catch (requestError) {
        if (!signal?.aborted) setError(errorMessage(requestError))
      }
    },
    [api],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => void refresh(controller.signal), 1000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh])

  const start = async () => {
    if (!target) return
    setBusy(true)
    setError('')
    try {
      setState(await api.startNavigation(target, mode))
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    setError('')
    try {
      setState(await api.stopNavigation())
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const active = state?.active ?? false
  return (
    <section className="navigation-control">
      <div className="navigation-control-heading">
        <div>
          <h3>로보독 자동 이동</h3>
          <p>목적지를 선택한 뒤 로보독의 실제 이동을 시작합니다.</p>
        </div>
        <span className={`badge ${active ? 'safe' : 'unknown'}`}>
          {state ? statusNames[state.status] : '상태 확인 중'}
        </span>
      </div>
      {state && (
        <div className="navigation-control-summary">
          <Navigation size={22} />
          <div>
            <strong>{state.message}</strong>
            <small>
              남은 직선거리 {number(state.distanceMeters, 'm')} · 마지막 명령{' '}
              {state.lastCommand ?? '대기'}
            </small>
          </div>
        </div>
      )}
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <div className="navigation-control-actions">
        {active && (
          <button className="stop-button" onClick={() => void stop()} disabled={busy}>
            <Octagon size={16} /> 이동 중지
          </button>
        )}
        <button
          className="primary"
          onClick={() => void start()}
          disabled={!target || busy}
        >
          <Navigation size={16} />
          {active ? '목적지 변경' : '로보독 이동 시작'}
        </button>
      </div>
    </section>
  )
}
