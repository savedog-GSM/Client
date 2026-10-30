import { useEffect, useRef, useState } from 'react'
import type { Api } from '../../api/client'
import type { PathMode, Point, WalkingRoute } from '../../api/types'
import { searchWalkingRoute } from './walkingRoute'
import { routeErrorMessage } from './routeErrors'

export function useWalkingRoute(api: Api) {
  const [route, setRoute] = useState<WalkingRoute | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const searchRevision = useRef(0)
  const routeRequest = useRef<AbortController | null>(null)
  useEffect(() => () => routeRequest.current?.abort(), [])
  function invalidateRoute() {
    routeRequest.current?.abort()
    searchRevision.current++
    setRoute(null)
    setError('')
    setLoading(false)
  }
  async function search(start: Point | null, end: Point | null, mode: PathMode) {
    if (!start || !end) return
    const currentSearch = ++searchRevision.current
    routeRequest.current?.abort()
    const controller = new AbortController()
    routeRequest.current = controller
    setLoading(true)
    setError('')
    setRoute(null)
    try {
      let result: WalkingRoute
      if (mode === 'SHORTEST') {
        result = await searchWalkingRoute(
          start,
          end,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        )
      } else {
        const collected = await api.searchPath(
          { latitude: start.latitude, longitude: start.longitude },
          { latitude: end.latitude, longitude: end.longitude },
          mode,
          AbortSignal.any([controller.signal, AbortSignal.timeout(15000)]),
        )
        result = {
          provider: 'KAKAO',
          path: collected.path,
          distanceMeters: collected.distanceMeters,
          durationSeconds: Math.ceil(collected.distanceMeters / 1.2),
          steps: [],
        }
      }
      if (currentSearch === searchRevision.current) setRoute(result)
    } catch (error) {
      if (currentSearch === searchRevision.current) setError(routeErrorMessage(error))
    } finally {
      if (currentSearch === searchRevision.current) setLoading(false)
    }
  }
  return { route, loading, error, search, invalidateRoute }
}
