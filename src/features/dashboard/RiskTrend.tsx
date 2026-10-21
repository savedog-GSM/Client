import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import type { Risk, Telemetry } from '../../api/types'
import { errorMessage } from '../../api/client'
import { useRobot } from '../../app/RobotProvider'
import { Empty, ErrorNotice, number } from '../../components/ui'

export default function RiskTrend({ currentRisk }: { currentRisk: Risk | null }) {
  const { api, history, now } = useRobot()
  const [minutes, setMinutes] = useState(1)
  const [records, setRecords] = useState<Telemetry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    setRecords([])
    const from = new Date(Date.now() - minutes * 60000).toISOString()
    api
      .telemetry(from, '', controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setRecords(data)
      })
      .catch((error) => {
        if (!controller.signal.aborted) setError(errorMessage(error))
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [api, minutes])
  const recordsInRange = useMemo(() => {
    const byId = new Map([...records, ...history].map((record) => [record.id, record]))
    return [...byId.values()]
      .filter((record) => {
        const timestamp = new Date(record.recordedAt).getTime()
        return timestamp >= now - minutes * 60000 && timestamp <= now
      })
      .sort((a, b) => new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime())
  }, [records, history, now, minutes])
  const points = recordsInRange.map((record) => ({
    x:
      40 +
      ((new Date(record.recordedAt).getTime() - (now - minutes * 60000)) / (minutes * 60000)) * 940,
    y: 140 - ((Math.min(5, Math.max(1, record.risk.score)) - 1) / 4) * 120,
  }))
  const line = points.map((point) => `${point.x},${point.y}`).join(' ')
  return (
    <section className="dashboard-trend panel">
      <div className="dashboard-panel-heading">
        <div>
          <h2>실시간 위험도</h2>
          <p>센서 데이터를 바탕으로 계산한 위험도 변화</p>
        </div>
        <div className="trend-actions">
          <div className="trend-periods" role="group" aria-label="그래프 조회 기간">
            {[1, 5, 10].map((value) => (
              <button
                key={value}
                aria-pressed={minutes === value}
                onClick={() => setMinutes(value)}
              >
                {value === 1 ? '최근 1분' : `${value}분`}
              </button>
            ))}
          </div>
          <Link to="/history">통계 보기 →</Link>
        </div>
      </div>
      <ErrorNotice message={error} />
      <div className="trend-content">
        <div className="trend-score">
          <span>현재 위험도</span>
          <strong>
            {currentRisk ? number(currentRisk.score) : '수신 대기'}
            <small>{currentRisk ? ' / 5' : ''}</small>
          </strong>
          <p>낮을수록 안전해요</p>
        </div>
        <div className="trend-chart">
          {points.length ? (
            <svg
              viewBox="0 0 1000 170"
              role="img"
              aria-label={`최근 ${minutes}분 위험도 추이, 1점에서 5점`}
            >
              {[1, 3, 5].map((value) => (
                <g key={value}>
                  <line
                    x1="40"
                    x2="980"
                    y1={140 - (value - 1) * 30}
                    y2={140 - (value - 1) * 30}
                    stroke="#e8edf5"
                    strokeDasharray="4 5"
                  />
                  <text x="16" y={144 - (value - 1) * 30} fill="#737373" fontSize="12">
                    {value}
                  </text>
                </g>
              ))}
              <polygon
                points={`${points[0].x},140 ${line} ${points[points.length - 1].x},140`}
                fill="#4b71ff12"
              />
              <polyline points={line} fill="none" stroke="#5278ff" strokeWidth="2.5" />
              <circle
                cx={points[points.length - 1].x}
                cy={points[points.length - 1].y}
                r="3"
                fill="#315ee8"
              />
              <text x="40" y="165" fill="#737373" fontSize="12">
                {minutes}분 전
              </text>
              <text x="955" y="165" fill="#737373" fontSize="12">
                현재
              </text>
            </svg>
          ) : (
            <Empty>
              {loading
                ? '위험도 기록을 불러오고 있습니다.'
                : '선택한 기간에 수신한 센서 데이터가 없습니다.'}
            </Empty>
          )}
          <p className="trend-note">서버 위험도 1–5점 기준 · 사고 발생 확률을 의미하지 않습니다</p>
        </div>
      </div>
    </section>
  )
}
