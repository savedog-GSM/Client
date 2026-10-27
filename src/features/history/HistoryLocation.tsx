import { useEffect, useState } from 'react'
import type { Api } from '../../api/client'
import { errorMessage } from '../../api/client'
import type { RobotStatus } from '../../api/types'
import { ErrorNotice, time } from '../../components/ui'

export default function HistoryLocation({ api }: { api: Api }) {
  const [location, setLocation] = useState<RobotStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api.status(AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])).then(
      (value) => {
        if (!controller.signal.aborted) {
          setLocation(value)
          setLoading(false)
        }
      },
      (error) => {
        if (!controller.signal.aborted) {
          setLocation(null)
          setError(errorMessage(error))
          setLoading(false)
        }
      },
    )
    return () => controller.abort()
  }, [api, revision])
  const hasLocation = location?.latitude != null && location.longitude != null
  return (
    <section className="panel history-location" aria-label="최근 위치 조회">
      <div className="section-heading">
        <div>
          <h2>최근 위치</h2>
          <p>로봇 상태에서 조회한 위치입니다. 아래 과거 센서 기록의 위치와는 별도입니다.</p>
        </div>
        <button disabled={loading} onClick={() => setRevision((value) => value + 1)}>
          {loading ? '위치 불러오는 중…' : '위치 다시 불러오기'}
        </button>
      </div>
      <ErrorNotice message={error} />
      {!loading && !error && (
        <>
          <dl className="details">
            <div>
              <dt>위도</dt>
              <dd>{location?.latitude?.toFixed(6) ?? '수신 없음'}</dd>
            </div>
            <div>
              <dt>경도</dt>
              <dd>{location?.longitude?.toFixed(6) ?? '수신 없음'}</dd>
            </div>
            <div>
              <dt>마지막 GPS 수신</dt>
              <dd>{time(location?.lastLocationAt ?? null)}</dd>
            </div>
          </dl>
          {!hasLocation && (
            <p role="status">
              위치값이 포함된 응답이 없습니다. 스마트폰 위치 전송과 센서 전송 상태를 확인해주세요.
            </p>
          )}
        </>
      )}
      <p className="muted">
        센서 기록에 위치가 저장되려면 센서 수신 당시 GPS가 5초 이내에 도착하고 위치 오차가 30m
        이하여야 합니다.
      </p>
    </section>
  )
}
