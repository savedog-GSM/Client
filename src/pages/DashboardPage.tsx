import { Gauge, MoveVertical, RotateCw, ShieldAlert, ShieldCheck, ShieldX } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AlertRow from '../components/AlertRow'
import StatChip from '../components/StatChip'
import type { Alert, SensorData } from '../types'
import { calculateRisk, calculateRiskScore } from '../utils/risk'
import { getAlerts, getSensorData, saveSensorData } from '../utils/storage'

export default function DashboardPage() {
  const [sensor, setSensor] = useState<SensorData>({ distance: 850, roll: 2.1, pitch: -1.4, timestamp: Date.now() })
  const [history, setHistory] = useState<SensorData[]>(getSensorData().slice(-24))
  const [alerts, setAlerts] = useState<Alert[]>(getAlerts())

  useEffect(() => {
    const interval = setInterval(() => {
      const nextSensor: SensorData = {
        distance: Math.max(150, Math.round(250 + Math.random() * 750)),
        roll: Number((Math.random() * 20 - 10).toFixed(1)),
        pitch: Number((Math.random() * 20 - 10).toFixed(1)),
        timestamp: Date.now(),
      }
      setSensor(nextSensor)
      saveSensorData(nextSensor)
      setHistory((current) => [...current, nextSensor].slice(-24))
      setAlerts(getAlerts())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  const risk = calculateRisk(sensor)
  const statusMeta = {
    safe: { text: '안전', icon: ShieldCheck, iconClass: 'bg-emerald-50 text-emerald-600' },
    warning: { text: '주의', icon: ShieldAlert, iconClass: 'bg-amber-50 text-amber-600' },
    danger: { text: '위험', icon: ShieldX, iconClass: 'bg-red-50 text-red-600' },
  }[risk]

  const chartValues = useMemo(() => {
    const values = history.map(calculateRiskScore)
    if (values.length >= 2) return values
    return [18, 25, 21, 34, 28, 42, 36, 31, 45, 39, 52, 47, 41, 55, 48, 43, 58, 51, 46, 40, 49, 44, 38, calculateRiskScore(sensor)]
  }, [history, sensor])

  const latestAlerts = alerts.slice(0, 5)

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-ink sm:text-2xl">대시보드</h1>
        <p className="mt-1 text-sm text-ink-muted">로보독의 상태와 이동 안전 정보를 실시간으로 확인합니다.</p>
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatChip
          icon={Gauge}
          iconClassName="bg-orange-50 text-orange-600"
          label="전방 거리 (ToF)"
          value={`${sensor.distance}mm`}
          tag={sensor.distance < 500 ? { text: '주의', className: 'text-amber-600' } : undefined}
        />
        <StatChip icon={RotateCw} iconClassName="bg-violet-50 text-violet-600" label="좌우 기울기 (Roll)" value={`${sensor.roll}°`} />
        <StatChip icon={MoveVertical} iconClassName="bg-teal-50 text-teal-600" label="앞뒤 기울기 (Pitch)" value={`${sensor.pitch}°`} />
        <StatChip icon={statusMeta.icon} iconClassName={statusMeta.iconClass} label="종합 상태" value={statusMeta.text} />
      </section>

      <section className="grid min-h-[560px] grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-ink">실시간 위험도</h2>
              <p className="mt-1 text-xs text-ink-muted">센서 데이터를 바탕으로 계산된 최근 위험도 변화</p>
            </div>
            <Link to="/statistics" className="text-xs font-semibold text-accent hover:text-accent-strong hover:underline">
              통계 보기
            </Link>
          </div>

          <div className="mt-5 h-[440px] w-full">
            <RiskLineChart values={chartValues} />
          </div>
        </div>

        <aside className="min-w-0 rounded-xl border border-line bg-surface p-5 sm:p-6">
          <div className="flex items-center justify-between border-b border-line pb-4">
            <div>
              <h2 className="text-base font-semibold text-ink">알림</h2>
              <p className="mt-1 text-xs text-ink-muted">최근 발생한 알림 5건</p>
            </div>
            <Link to="/alerts" className="text-xs font-semibold text-accent hover:text-accent-strong hover:underline">
              전체보기
            </Link>
          </div>

          <div className="divide-y divide-line">
            {latestAlerts.length > 0 ? (
              latestAlerts.map((alert) => <AlertRow key={alert.id} alert={alert} />)
            ) : (
              <div className="flex h-[440px] items-center justify-center text-sm text-ink-faint">현재 알림이 없습니다.</div>
            )}
          </div>
        </aside>
      </section>
    </div>
  )
}

function RiskLineChart({ values }: { values: number[] }) {
  const width = 900
  const height = 410
  const padding = { top: 18, right: 18, bottom: 34, left: 42 }
  const innerWidth = width - padding.left - padding.right
  const innerHeight = height - padding.top - padding.bottom
  const points = values.map((value, index) => {
    const x = padding.left + (index / Math.max(values.length - 1, 1)) * innerWidth
    const y = padding.top + (1 - Math.min(value, 100) / 100) * innerHeight
    return { x, y, value }
  })
  const path = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <div className="h-full w-full overflow-hidden rounded-lg bg-[#fafbfc] px-2 py-3">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-full w-full" preserveAspectRatio="none" role="img" aria-label="실시간 위험도 선 그래프">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = padding.top + (1 - value / 100) * innerHeight
          return (
            <g key={value}>
              <line x1={padding.left} x2={width - padding.right} y1={y} y2={y} stroke="#e7eaf0" strokeWidth="1" />
              <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="11" fill="#97a0ac">{value}</text>
            </g>
          )
        })}
        <path d={path} fill="none" stroke="#2955c9" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {points.map((point, index) => (
          <circle key={index} cx={point.x} cy={point.y} r="3.5" fill="#ffffff" stroke="#2955c9" strokeWidth="2" />
        ))}
        <text x={padding.left} y={height - 8} fontSize="11" fill="#97a0ac">최근</text>
        <text x={width - padding.right} y={height - 8} textAnchor="end" fontSize="11" fill="#97a0ac">현재</text>
        <text x="14" y={padding.top + 4} fontSize="11" fill="#636d7c">위험도</text>
      </svg>
    </div>
  )
}
