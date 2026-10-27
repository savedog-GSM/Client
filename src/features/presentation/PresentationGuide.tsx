import { useState } from 'react'
import { ChevronLeft, ChevronRight, Play, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import './presentation.css'

const steps = [
  {
    title: '실시간 상태',
    path: '/',
    description: '전방 거리와 기울기, 현재 위험도와 이동 위치를 함께 보여주세요.',
  },
  {
    title: '안전 경로',
    path: '/map',
    description: '출발지와 도착지를 검색하고 안전 우선·최단 거리 경로를 비교하세요.',
  },
  {
    title: '로봇 제어',
    path: '/',
    hash: '#robot-controls',
    description:
      '전진·정지 등 제어 버튼과 카메라 화면을 확인하세요. 실제 모드에서는 로봇이 움직입니다.',
  },
  {
    title: '이동 통계',
    path: '/history',
    description: '최근 이동 기록에서 거리·기울기·위험도 변화를 확인하세요.',
  },
  {
    title: '위험 알림',
    path: '/alerts',
    description: '위험 감지 시각과 자동 정지 여부를 보여주세요.',
  },
  {
    title: '위험 신고',
    path: '/reports',
    description: '현장 사진을 확인하고 안전신문고에 접수한 번호를 기록하는 과정을 보여주세요.',
  },
  {
    title: '위치 전송',
    path: '/location',
    description:
      '위치 전송을 시작하고 마지막 전송 시각을 확인하세요. 실제 모드는 스마트폰에서 사용하세요.',
  },
]

export default function PresentationGuide() {
  const location = useLocation()
  const navigate = useNavigate()
  const [choosing, setChoosing] = useState(false)
  const query = new URLSearchParams(location.search)
  const active = query.get('present') === '1'
  const demo = query.get('demo') === '1'
  if (location.pathname === '/facilities') return null
  const index = Math.max(
    0,
    steps.findIndex(
      (item) => item.path === location.pathname && (item.hash ?? '') === location.hash,
    ),
  )
  const step = steps[index]
  function go(next: number, mode = demo) {
    const target = steps[next]
    const search = new URLSearchParams(location.search)
    search.set('present', '1')
    search.set('step', String(next))
    if (mode) search.set('demo', '1')
    else {
      search.delete('demo')
      search.delete('scenario')
      search.delete('run')
    }
    navigate({ pathname: target.path, search: search.toString(), hash: target.hash ?? '' })
    setChoosing(false)
    if (!target.hash) window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function close() {
    const search = new URLSearchParams(location.search)
    search.delete('present')
    search.delete('step')
    navigate({ pathname: location.pathname, search: search.toString(), hash: location.hash })
  }
  if (!active)
    return (
      <div className="presentation-launcher">
        {choosing && (
          <section className="presentation-picker" aria-label="발표 모드 선택">
            <div className="presentation-heading">
              <strong>3분 기능 시연</strong>
              <button aria-label="모드 선택 닫기" onClick={() => setChoosing(false)}>
                <X size={16} />
              </button>
            </div>
            <p>상태 확인부터 위치 전송까지 순서대로 안내합니다.</p>
            <button className="primary" onClick={() => go(0, true)}>
              예시 데이터로 시작
            </button>
            <button onClick={() => go(0, false)}>실제 연결로 시작</button>
            <small>예시 데이터는 실제 로봇의 위치나 동작을 나타내지 않습니다.</small>
          </section>
        )}
        <button
          className="presentation-start"
          onClick={() => setChoosing((value) => !value)}
          aria-expanded={choosing}
        >
          <Play size={16} />
          발표 시작
        </button>
      </div>
    )
  return (
    <aside className="presentation-guide" aria-label="발표 가이드">
      <div className="presentation-heading">
        <span className="presentation-mode">{demo ? '시연 모드 · 예시 데이터' : '실제 연결'}</span>
        <span>
          {index + 1} / {steps.length}
        </span>
        <button onClick={close} aria-label="발표 가이드 접기">
          <X size={18} />
        </button>
      </div>
      <nav aria-label="발표 순서">
        {steps.map((item, i) => (
          <button
            key={item.title}
            onClick={() => go(i)}
            aria-current={i === index ? 'step' : undefined}
          >
            {i + 1}. {item.title}
          </button>
        ))}
      </nav>
      <div className="presentation-description">
        <strong>{step.title}</strong>
        <p>{step.description}</p>
      </div>
      <div className="presentation-footer">
        <button disabled={index === 0} onClick={() => go(index - 1)}>
          <ChevronLeft size={16} />
          이전
        </button>
        <button
          className="primary"
          onClick={() => (index === steps.length - 1 ? close() : go(index + 1))}
        >
          {index === steps.length - 1 ? '발표 마치기' : '다음 기능'}
          <ChevronRight size={16} />
        </button>
      </div>
    </aside>
  )
}
