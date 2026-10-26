import type { Api } from '../../api/client'
import type { ConnectionSettings } from '../../api/types'
import { ErrorNotice, number, PageTitle } from '../../components/ui'
import { useLocationTransfer } from './useLocationTransfer'

export default function LocationPage({
  settings,
  apiOverride,
  simulated = false,
}: {
  settings: ConnectionSettings
  apiOverride?: Api
  simulated?: boolean
}) {
  const { running, location, sentAt, error, wakeMessage, message, start, stop, voiceError } =
    useLocationTransfer(settings, apiOverride, simulated)
  return (
    <div className="location-page">
      <PageTitle
        title="스마트폰 위치 전송"
        description={
          simulated
            ? '시연용 GPS 위치입니다. 실제 위치 접근이나 서버 전송은 하지 않습니다.'
            : '로보독에 올려둔 스마트폰에서 이 화면을 열어주세요.'
        }
      />
      <ErrorNotice message={error} />
      <section className="panel location-card">
        <span className={`location-indicator ${running ? 'active' : ''}`}>◎</span>
        <h2>{running ? '위치 전송 중' : '전송 대기'}</h2>
        <p role="status">{message}</p>
        <dl className="details">
          <div>
            <dt>위도</dt>
            <dd>{location?.latitude.toFixed(6) ?? '값 없음'}</dd>
          </div>
          <div>
            <dt>경도</dt>
            <dd>{location?.longitude.toFixed(6) ?? '값 없음'}</dd>
          </div>
          <div>
            <dt>위치 오차</dt>
            <dd>{number(location?.accuracy, ' m')}</dd>
          </div>
          <div>
            <dt>마지막 전송 성공</dt>
            <dd>{sentAt || '전송 기록 없음'}</dd>
          </div>
        </dl>
        <button
          className={`location-send-button ${running ? 'stop-button' : 'primary'}`}
          onClick={running ? stop : start}
        >
          {running ? '전송 중지' : '위치 전송 시작'}
        </button>
        {voiceError && (
          <p className="muted" role="status" aria-label="음성 안내 상태">
            {voiceError}
          </p>
        )}
        <p className="muted">{simulated ? '예시 GPS · 위치 오차 3m' : wakeMessage}</p>
      </section>
      <p className="muted">
        화면을 켜두고 이 페이지를 유지해주세요. 위치 오차 30m 이내의 값만 전송합니다. 위치
        전송만으로 이동 기록이 생성되지는 않습니다.
      </p>
    </div>
  )
}
