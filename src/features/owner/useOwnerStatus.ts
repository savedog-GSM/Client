import { useCallback, useEffect, useState } from 'react'
import type { OwnerReturnResult, OwnerSightingResult } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { errorMessage } from '../../api/client'

export default function useOwnerStatus() {
  const { api, demo } = useRobot()
  const [sighting, setSighting] = useState<OwnerSightingResult | null>(null)
  const [returnState, setReturnState] = useState<OwnerReturnResult | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    async (signal?: AbortSignal) => {
      if (demo) {
        setSighting({
          available: true,
          registeredFaces: 2,
          fresh: true,
          ownerVisible: true,
          sighting: {
            frameReceivedAt: new Date().toISOString(),
            analyzedAt: new Date().toISOString(),
            facesInFrame: 1,
            ownerVisible: true,
            similarity: 0.82,
            horizontalOffset: 0.04,
            verticalOffset: -0.08,
            direction: 'CENTER',
            faceWidthRatio: 0.22,
          },
        })
        setReturnState({
          active: false,
          status: 'IDLE',
          message: '시연 모드에서는 실제 로보독을 움직이지 않습니다.',
          owner: null,
          ownerAccuracy: null,
          ownerUpdatedAt: null,
          robot: null,
          distanceMeters: null,
          route: [],
          lastCommand: null,
          lastCommandAt: null,
          startedAt: null,
          finishedAt: null,
        })
        setLoading(false)
        return
      }
      try {
        const [nextSighting, nextReturn] = await Promise.all([
          api.ownerSighting(signal),
          api.ownerReturn(signal),
        ])
        setSighting(nextSighting)
        setReturnState(nextReturn)
        setError('')
      } catch (requestError) {
        if (signal?.aborted) return
        setError(errorMessage(requestError))
      } finally {
        if (!signal?.aborted) setLoading(false)
      }
    },
    [api, demo],
  )

  useEffect(() => {
    const controller = new AbortController()
    void refresh(controller.signal)
    const timer = window.setInterval(() => void refresh(controller.signal), 1000)
    return () => {
      controller.abort()
      window.clearInterval(timer)
    }
  }, [refresh])

  return { sighting, returnState, error, loading, refresh }
}
