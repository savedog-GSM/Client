import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import { useRobot } from '../../app/RobotProvider'
import { Empty } from '../../components/ui'
import type { VisionResult } from '../../api/types'
import VisionPanel from './VisionPanel'

export default function CameraPanel() {
  const { api, now, demo } = useRobot()
  const [enabled, setEnabled] = useState(false)
  const [url, setUrl] = useState('')
  const [error, setError] = useState('')
  const [visionError, setVisionError] = useState('')
  const [vision, setVision] = useState<{ result: VisionResult; requestedAt: number } | null>(null)
  useEffect(() => {
    setUrl('')
    setVision(null)
    setError('')
    setVisionError('')
    if (!enabled) return
    let active = true
    let timer: ReturnType<typeof setTimeout>
    const controller = new AbortController()
    async function load() {
      const requestedAt = Date.now()
      const signal = AbortSignal.any([controller.signal, AbortSignal.timeout(15000)])
      await Promise.all([
        api.frame(signal).then(
          (result) => {
            if (!active) return
            setUrl(result.url)
            setError('')
          },
          (error) => {
            if (!active) return
            setUrl('')
            setError(errorMessage(error))
          },
        ),
        api.vision(signal).then(
          (result) => {
            if (!active) return
            setVision({ result, requestedAt })
            setVisionError('')
          },
          (error) => {
            if (!active) return
            setVision(null)
            setVisionError(errorMessage(error))
          },
        ),
      ])
      if (active) timer = setTimeout(() => void load(), 1000)
    }
    void load()
    return () => {
      active = false
      controller.abort()
      clearTimeout(timer)
    }
  }, [api, enabled])
  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <h2>카메라 및 물체 인식</h2>
          <p>
            {demo
              ? '시연용 이미지와 예시 인식 결과입니다.'
              : '1초마다 최신 프레임과 인식 결과를 조회합니다.'}
          </p>
        </div>
        <button
          aria-pressed={enabled}
          onClick={() => {
            setEnabled(!enabled)
            setUrl('')
          }}
        >
          {enabled ? '조회 중지' : '카메라 보기'}
        </button>
      </div>
      {enabled && url ? (
        <img
          className="camera-image"
          src={url}
          alt={demo ? '시연용 카메라 이미지' : '로보독 최신 카메라 프레임'}
          onError={() => {
            setUrl('')
            setError('이미지를 불러오지 못했습니다.')
          }}
        />
      ) : (
        <Empty>
          {enabled
            ? error || '프레임을 불러오는 중입니다.'
            : '카메라 보기를 누르면 프레임과 물체 인식 결과를 확인할 수 있습니다.'}
        </Empty>
      )}
      {enabled && (
        <VisionPanel
          result={vision?.result ?? null}
          fresh={!!vision?.result.fresh && now - vision.requestedAt <= 3000}
          error={visionError}
        />
      )}
    </section>
  )
}
