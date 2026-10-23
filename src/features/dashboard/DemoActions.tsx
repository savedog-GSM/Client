import { Link, useLocation, useNavigate } from 'react-router-dom'
import type { RiskLevel } from '../../api/types'
import './demo-actions.css'

const scenarios: { level: RiskLevel; title: string; description: string }[] = [
  { level: 'SAFE', title: '안전', description: '장애물 없는 상태' },
  { level: 'CAUTION', title: '주의', description: '전방 장애물 주의 알림' },
  { level: 'DANGER', title: '위험', description: '자동 정지·알림·신고 생성' },
]

export default function DemoActions() {
  const location = useLocation()
  const navigate = useNavigate()
  const query = new URLSearchParams(location.search)
  if (query.get('demo') !== '1') return null
  const selected = query.get('scenario') ?? 'SAFE'
  function select(level: RiskLevel) {
    const next = new URLSearchParams(location.search)
    next.set('scenario', level)
    navigate({ pathname: '/', search: next.toString(), hash: location.hash })
  }
  return (
    <section className="demo-actions" aria-label="위험 상황 시연">
      <div className="demo-actions-heading">
        <strong>상황 시연</strong>
        <span>예시 센서·알림만 바뀝니다.</span>
      </div>
      <div className="demo-scenarios">
        {scenarios.map((scenario) => (
          <button
            key={scenario.level}
            className={scenario.level.toLowerCase()}
            aria-pressed={selected === scenario.level}
            onClick={() => select(scenario.level)}
          >
            <strong>{scenario.title}</strong>
            <small>{scenario.description}</small>
          </button>
        ))}
      </div>
      <div className="demo-action-links">
        <Link to={`/${location.search}#robot-controls`}>로봇 제어·카메라 열기</Link>
        <Link to={`/alerts${location.search}`}>알림 확인 →</Link>
        <Link to={`/reports${location.search}`}>신고 처리 →</Link>
      </div>
    </section>
  )
}
