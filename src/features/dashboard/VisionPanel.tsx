import type { VisionResult } from '../../api/types'
import { ErrorNotice, RiskBadge, time } from '../../components/ui'

export default function VisionPanel({
  result,
  fresh,
  error,
}: {
  result: VisionResult | null
  fresh: boolean
  error: string
}) {
  const risk =
    result?.available && fresh && result.level && result.score !== null
      ? { level: result.level, score: result.score, reason: result.reason }
      : null
  return (
    <div className="camera-vision">
      <h3>물체 인식 결과</h3>
      <ErrorNotice message={error} />
      {!error && !result && <p>인식 결과를 불러오는 중입니다.</p>}
      {result && (
        <>
          <p role="status">
            {!result.available
              ? '서버의 물체 인식 모델이 꺼져 있습니다.'
              : !result.frameReceivedAt
                ? '분석할 사진을 기다리고 있습니다.'
                : !fresh
                  ? '오래된 인식 결과입니다. 현재 위험 판단에는 사용하지 않습니다.'
                  : '최신 사진의 인식 결과입니다.'}
          </p>
          {result.available && result.frameReceivedAt && (
            <>
              {risk && <RiskBadge risk={risk} />}
              {result.reason && <p>{fresh ? result.reason : `마지막 인식: ${result.reason}`}</p>}
              <dl className="details">
                <div>
                  <dt>사진 수신</dt>
                  <dd>{time(result.frameReceivedAt)}</dd>
                </div>
                <div>
                  <dt>분석 완료</dt>
                  <dd>{time(result.analyzedAt)}</dd>
                </div>
                <div>
                  <dt>분석 시간</dt>
                  <dd>{result.elapsedMs === null ? '값 없음' : `${result.elapsedMs}ms`}</dd>
                </div>
              </dl>
              <h4>{fresh ? '인식한 물체' : '마지막 사진의 물체'}</h4>
              {result.detections.length ? (
                <ul className="camera-detections">
                  {result.detections.map((detection, index) => (
                    <li key={`${detection.label}-${index}`}>
                      <strong>{detection.name || detection.label}</strong>
                      <span>신뢰도 {Math.round(detection.confidence * 100)}%</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>인식된 물체가 없습니다.</p>
              )}
            </>
          )}
        </>
      )}
      <p className="muted">종합 위험도와 정지·신고 판단은 센서 수신 시 서버에서 반영합니다.</p>
    </div>
  )
}
