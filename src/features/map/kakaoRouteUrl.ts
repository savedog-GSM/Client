import type { Point } from '../../api/types'

export function kakaoRouteUrl(start: Point, end: Point) {
  return `https://map.kakao.com/link/by/walk/출발지,${start.latitude},${start.longitude}/도착지,${end.latitude},${end.longitude}`
}
