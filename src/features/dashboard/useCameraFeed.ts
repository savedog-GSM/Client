import { useEffect, useState } from 'react'
import { errorMessage, type Api } from '../../api/client'
import type { VisionResult } from '../../api/types'

export function useCameraFeed(api: Api, enabled: boolean) {
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
  return {
    url,
    error,
    visionError,
    vision,
    clearFrame: () => setUrl(''),
    handleImageError: () => {
      setUrl('')
      setError('이미지를 불러오지 못했습니다.')
    },
  }
}
