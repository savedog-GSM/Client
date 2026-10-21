import { beforeEach, expect, it, vi } from 'vitest'
import { loadKakaoMaps } from './kakao'
import { reverseGeocode } from './reverseGeocode'

vi.mock('./kakao', () => ({ loadKakaoMaps: vi.fn() }))
const lookup = vi.fn()
type Callback = Parameters<kakao.maps.services.Geocoder['coord2Address']>[2]
const point = { latitude: 35.14332, longitude: 126.80079 }
beforeEach(() => {
  lookup.mockReset()
  vi.mocked(loadKakaoMaps).mockResolvedValue({
    services: {
      Geocoder: class {
        coord2Address = lookup
      },
      Status: { OK: 'OK', ZERO_RESULT: 'ZERO_RESULT', ERROR: 'ERROR' },
    },
  } as unknown as typeof kakao.maps)
})

it('경도·위도 순서로 조회하고 도로명을 우선한다', async () => {
  lookup.mockImplementation((_: number, __: number, callback: Callback) =>
    callback(
      [
        {
          road_address: { address_name: '광주 광산구 상무대로 312' },
          address: { address_name: '광주 광산구 송정동 1' },
        },
      ] as Parameters<Callback>[0],
      'OK' as kakao.maps.services.Status,
    ),
  )
  expect(await reverseGeocode(point)).toBe('광주 광산구 상무대로 312')
  expect(lookup).toHaveBeenCalledWith(126.80079, 35.14332, expect.any(Function))
})
it('도로명이 없으면 지번 주소를 사용한다', async () => {
  lookup.mockImplementation((_: number, __: number, callback: Callback) =>
    callback(
      [
        { road_address: null, address: { address_name: '광주 광산구 송정동 1' } },
      ] as Parameters<Callback>[0],
      'OK' as kakao.maps.services.Status,
    ),
  )
  expect(await reverseGeocode(point)).toBe('광주 광산구 송정동 1')
})
it('주소가 없으면 빈 결과를 반환하고 서비스 오류는 전달한다', async () => {
  lookup
    .mockImplementationOnce((_: number, __: number, callback: Callback) =>
      callback([], 'ZERO_RESULT' as kakao.maps.services.Status),
    )
    .mockImplementationOnce((_: number, __: number, callback: Callback) =>
      callback([], 'ERROR' as kakao.maps.services.Status),
    )
  expect(await reverseGeocode(point)).toBeNull()
  await expect(reverseGeocode(point)).rejects.toThrow('주소 조회에 실패했습니다.')
})
