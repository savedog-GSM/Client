import { useState } from 'react'
import { LocateFixed, Navigation, Octagon } from 'lucide-react'
import type { OwnerReturnResult } from '../../api/types'
import type { Api } from '../../api/client'
import { errorMessage } from '../../api/client'
import { number, time } from '../../components/ui'
import { returnStatusNames } from './ownerLabels'

function currentPosition() {
  return new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 5000,
    }),
  )
}

export default function ReturnControl({
  api,
  state,
  disabled,
  onChange,
}: {
  api: Api
  state: OwnerReturnResult | null
  disabled: boolean
  onChange: () => void
}) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const start = async () => {
    setBusy(true)
    setError('')
    try {
      const position = await currentPosition()
      await api.startOwnerReturn({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
      })
      onChange()
    } catch (requestError) {
      setError(
        requestError instanceof GeolocationPositionError
          ? '현재 위치를 가져오지 못했습니다. 브라우저의 위치 권한을 허용해주세요.'
          : errorMessage(requestError),
      )
    } finally {
      setBusy(false)
    }
  }

  const stop = async () => {
    setBusy(true)
    setError('')
    try {
      await api.stopOwnerReturn()
      onChange()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const active = state?.active ?? false
  return (
    <section className="panel owner-return-card">
      <div className="section-heading">
        <div>
          <h2>주인에게 돌아가기</h2>
          <p>현재 스마트폰 위치를 목표로 로보독의 복귀를 시작합니다.</p>
        </div>
        <span className={`badge ${active ? 'safe' : 'unknown'}`}>
          {state ? returnStatusNames[state.status] : '상태 확인 중'}
        </span>
      </div>
      <div className="owner-return-summary">
        <Navigation size={34} />
        <div>
          <strong>
            {state ? returnStatusNames[state.status] : '서버 상태를 확인하고 있습니다.'}
          </strong>
          <p>{state?.message || '현재 위치를 보내면 로보독이 안전 경로를 따라 돌아옵니다.'}</p>
        </div>
      </div>
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      <div className="owner-return-metrics">
        <div>
          <span>남은 직선거리</span>
          <strong>{number(state?.distanceMeters, 'm')}</strong>
        </div>
        <div>
          <span>마지막 로봇 명령</span>
          <strong>{state?.lastCommand ?? '대기'}</strong>
        </div>
        <div>
          <span>주인 위치 갱신</span>
          <strong>{time(state?.ownerUpdatedAt ?? null)}</strong>
        </div>
      </div>
      <div className="actions owner-return-actions">
        {active && (
          <button className="stop-button" onClick={stop} disabled={busy || disabled}>
            <Octagon size={17} /> 돌아가기 중지
          </button>
        )}
        <button className="primary" onClick={start} disabled={busy || disabled}>
          <LocateFixed size={17} />
          {active ? '현재 위치 갱신' : '현재 위치로 돌아오기 시작'}
        </button>
      </div>
    </section>
  )
}
