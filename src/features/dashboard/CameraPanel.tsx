import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { useRobot } from '../../app/RobotProvider'
import { Empty } from '../../components/ui'

export default function CameraPanel() {
  const { api } = useRobot()
  const [enabled, setEnabled] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  useEffect(() => {
    if (!enabled) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    async function load() {
      try {
        const result = await api.frame()
        if (active) { setUrl(result.url); setError('') }
      } catch (error) { if (active) { setUrl(''); setError(errorMessage(error)) } }
      if (active) timer = setTimeout(() => void load(), 3000)
    }
    void load()
    return () => { active = false; clearTimeout(timer) }
  }, [api, enabled])
  return <section className="panel"><div className="section-heading"><div><h2>카메라</h2><p>선택 기능 · 3초마다 최신 프레임을 조회합니다.</p></div><button onClick={() => { setEnabled(!enabled); setUrl('') }}>{enabled ? '조회 중지' : '프레임 보기'}</button></div>
    {enabled && url ? <img className="camera-image" src={url} alt="로보독 최신 카메라 프레임" onError={() => { setUrl(''); setError('이미지를 불러오지 못했습니다.') }} /> : <Empty>{enabled ? error || '프레임을 불러오는 중입니다.' : '카메라 기능은 현재 보류 상태입니다.'}</Empty>}
  </section>
}
