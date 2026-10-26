import { useEffect, useMemo, useRef, useState } from 'react'
import { errorMessage } from '../../api/client'
import type { ConnectionSettings } from '../../api/types'
import { demoPosition } from '../demo/session'
import { createFacilitiesApi } from './api'
import { demoFacilityRoute } from './demo'
import { locate } from './locate'
import {
  facilityNames,
  type FacilityCategory,
  type FacilityOrigin,
  type FacilityRoute,
} from './types'

export function useFacilityRoute(settings: ConnectionSettings, simulated: boolean) {
  const api = useMemo(() => createFacilitiesApi(settings), [settings])
  const request = useRef<AbortController | null>(null)
  const [category, setCategory] = useState<FacilityCategory | null>(null)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<{ origin: FacilityOrigin; data: FacilityRoute } | null>(null)
  useEffect(() => {
    setResult(null)
    setPending(false)
    setCategory(null)
    setError('')
    setMessage('')
    return () => request.current?.abort()
  }, [api, simulated])

  async function search(next: FacilityCategory) {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setCategory(next)
    setResult(null)
    setError('')
    setPending(true)
    setMessage(simulated ? '시연용 경로를 준비하고 있습니다.' : '현재 위치를 확인하고 있습니다.')
    try {
      const origin = simulated ? { ...demoPosition, accuracy: 3 } : await locate()
      if (controller.signal.aborted) return
      setMessage(`가까운 ${facilityNames[next]}과 보행 경로를 찾고 있습니다.`)
      const data = simulated
        ? demoFacilityRoute(next)
        : await api.nearestRoute(next, origin, controller.signal)
      if (controller.signal.aborted) return
      setResult({ origin, data })
      setMessage(`${data.facility.name}까지의 ${simulated ? '시연용 ' : ''}경로를 찾았습니다.`)
    } catch (error) {
      if (!controller.signal.aborted) {
        setMessage('')
        setError(errorMessage(error))
      }
    } finally {
      if (!controller.signal.aborted) setPending(false)
    }
  }
  function cancel() {
    request.current?.abort()
    setPending(false)
    setMessage('검색을 취소했습니다. 이용할 시설을 다시 선택해주세요.')
  }
  return { category, pending, message, error, result, search, cancel }
}
