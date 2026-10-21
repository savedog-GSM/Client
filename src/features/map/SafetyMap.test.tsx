import { render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import SafetyMap from './SafetyMap'
import { loadKakaoMaps } from './kakao'

vi.mock('./kakao', () => ({ loadKakaoMaps: vi.fn() }))

const setCenter = vi.fn()
class LatLng {
  constructor(
    public latitude: number,
    public longitude: number,
  ) {}
  getLat() {
    return this.latitude
  }
  getLng() {
    return this.longitude
  }
}
class Map {
  setCenter = setCenter
  getBounds() {
    return {
      getSouthWest: () => new LatLng(35, 126),
      getNorthEast: () => new LatLng(36, 127),
    }
  }
}
class CustomOverlay {
  setMap() {}
}
const maps = {
  Map,
  LatLng,
  CustomOverlay,
  event: { addListener: vi.fn(), removeListener: vi.fn() },
}
const props = {
  currentPosition: null,
  position: { latitude: 37.5, longitude: 127 },
  start: null,
  end: null,
  segments: [],
  reports: [],
  records: [],
  route: null,
  onSelect: vi.fn(),
  onBounds: vi.fn(),
}
beforeEach(() => {
  vi.clearAllMocks()
  vi.mocked(loadKakaoMaps).mockResolvedValue(maps as unknown as typeof kakao.maps)
  vi.stubGlobal('kakao', { maps })
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  )
})
afterEach(() => vi.unstubAllGlobals())

it('로봇 위치보다 현재 위치를 우선해 중심을 잡는다', async () => {
  render(<SafetyMap {...props} currentPosition={{ latitude: 35.123, longitude: 126.456 }} />)
  await waitFor(() => expect(setCenter).toHaveBeenCalledWith(new LatLng(35.123, 126.456)))
  expect(setCenter).toHaveBeenCalledTimes(1)
})
it('현재 위치가 늦게 도착해도 이동하고 이후 로봇 갱신에는 중심을 유지한다', async () => {
  const view = render(<SafetyMap {...props} />)
  await waitFor(() => expect(setCenter).toHaveBeenCalledWith(new LatLng(37.5, 127)))
  const currentPosition = { latitude: 35.123, longitude: 126.456 }
  view.rerender(<SafetyMap {...props} currentPosition={currentPosition} />)
  await waitFor(() => expect(setCenter).toHaveBeenLastCalledWith(new LatLng(35.123, 126.456)))
  view.rerender(
    <SafetyMap
      {...props}
      currentPosition={currentPosition}
      position={{ latitude: 38, longitude: 128 }}
    />,
  )
  expect(setCenter).toHaveBeenCalledTimes(2)
})
it('어떤 위치도 없으면 지도 기본 중심을 유지한다', async () => {
  render(<SafetyMap {...props} position={null} />)
  await waitFor(() => expect(props.onBounds).toHaveBeenCalled())
  expect(setCenter).not.toHaveBeenCalled()
})
