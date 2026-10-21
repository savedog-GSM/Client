import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, expect, it, vi } from 'vitest'
import AddressSearch from './AddressSearch'
import { searchLocations, type LocationResult } from './searchLocations'

vi.mock('./searchLocations', () => ({ searchLocations: vi.fn() }))
beforeEach(() => vi.mocked(searchLocations).mockReset())

it('결과 없음과 검색 실패를 안내한다', async () => {
  vi.mocked(searchLocations)
    .mockResolvedValueOnce([])
    .mockRejectedValueOnce(new Error('검색 서버 오류'))
  render(<AddressSearch label="출발지 주소" value="광주" onChange={vi.fn()} onSelect={vi.fn()} />)
  await userEvent.click(screen.getByRole('button', { name: '출발지 주소 검색' }))
  expect(await screen.findByText(/검색 결과가 없습니다/)).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: '출발지 주소 검색' }))
  expect(await screen.findByText('검색 서버 오류')).toBeTruthy()
})
it('검색어가 바뀌면 이전 검색의 늦은 응답을 무시한다', async () => {
  let finish: (results: LocationResult[]) => void = () => {}
  vi.mocked(searchLocations).mockReturnValue(
    new Promise((resolve) => {
      finish = resolve
    }),
  )
  const props = { label: '출발지 주소', onChange: vi.fn(), onSelect: vi.fn() }
  const view = render(<AddressSearch {...props} value="이전 주소" />)
  await userEvent.click(screen.getByRole('button', { name: '출발지 주소 검색' }))
  view.rerender(<AddressSearch {...props} value="새 주소" />)
  await act(async () => {
    finish([{ name: '이전 결과', address: '주소', latitude: 35, longitude: 126 }])
  })
  expect(screen.queryByText('이전 결과')).toBeNull()
})
