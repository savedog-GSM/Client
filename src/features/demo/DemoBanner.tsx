import { useLocation, useNavigate } from 'react-router-dom'
import './demo.css'

export default function DemoBanner() {
  const location = useLocation()
  const navigate = useNavigate()
  function change(reset: boolean) {
    const query = new URLSearchParams(location.search)
    query.delete('scenario')
    if (reset) query.set('run', String(Date.now()))
    else {
      query.delete('demo')
      query.delete('run')
    }
    navigate({ pathname: location.pathname, search: query.toString(), hash: location.hash })
  }
  return (
    <section className="demo-banner" aria-label="시연 모드 안내">
      <div>
        <strong>시연 모드 · 예시 데이터</strong>
        <span>실제 로봇·서버로 전송되지 않습니다. 경로와 영상도 예시입니다.</span>
      </div>
      <div className="demo-banner-actions">
        <button onClick={() => change(true)}>시연 초기화</button>
        <button onClick={() => change(false)}>실제 연결로 전환</button>
      </div>
    </section>
  )
}
