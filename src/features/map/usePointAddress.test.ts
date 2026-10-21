import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'
import { reverseGeocode } from './reverseGeocode'
import { usePointAddress, type AddressPoint } from './usePointAddress'

vi.mock('./reverseGeocode', () => ({ reverseGeocode: vi.fn() }))
beforeEach(() => vi.mocked(reverseGeocode).mockReset())

it('검색 결과에 주소가 있으면 다시 조회하지 않는다', () => {
  const point = { latitude: 35, longitude: 126, address: '광주 광산구 상무대로 312' }
  const { result } = renderHook(() => usePointAddress(point))
  expect(result.current).toBe(point.address)
  expect(reverseGeocode).not.toHaveBeenCalled()
})
it('선택한 지점이 바뀌면 이전 지점의 늦은 응답을 무시한다', async () => {
  let finish: (value: string) => void = () => {}
  vi.mocked(reverseGeocode)
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finish = resolve
        }),
    )
    .mockResolvedValueOnce('새 주소')
  const { result, rerender } = renderHook(
    ({ point }: { point: AddressPoint }) => usePointAddress(point),
    {
      initialProps: { point: { latitude: 35, longitude: 126 } },
    },
  )
  expect(result.current).toBe('주소 확인 중…')
  rerender({ point: { latitude: 36, longitude: 127 } })
  await waitFor(() => expect(result.current).toBe('새 주소'))
  await act(async () => {
    finish('이전 주소')
  })
  expect(result.current).toBe('새 주소')
})
it('주소가 없는 위치와 조회 실패를 구분한다', async () => {
  vi.mocked(reverseGeocode)
    .mockResolvedValueOnce(null)
    .mockRejectedValueOnce(new Error('통신 오류'))
  const { result, rerender } = renderHook(
    ({ point }: { point: AddressPoint }) => usePointAddress(point),
    {
      initialProps: { point: { latitude: 35, longitude: 126 } },
    },
  )
  await waitFor(() => expect(result.current).toBe('주소 정보가 없는 위치입니다.'))
  rerender({ point: { latitude: 36, longitude: 127 } })
  await waitFor(() => expect(result.current).toBe('주소를 불러오지 못했습니다.'))
})
