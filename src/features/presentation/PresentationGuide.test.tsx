import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it, vi } from 'vitest'
import PresentationGuide from './PresentationGuide'

function Address() {
  const location = useLocation()
  return (
    <output aria-label="현재 주소">
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  )
}
function open(url = '/') {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  render(
    <MemoryRouter initialEntries={[url]}>
      <PresentationGuide />
      <Address />
    </MemoryRouter>,
  )
  return userEvent.setup()
}

it('예시 데이터 발표를 시작하고 제어 화면까지 시연 상태를 유지한다', async () => {
  const user = open()
  await user.click(screen.getByRole('button', { name: '발표 시작' }))
  await user.click(screen.getByRole('button', { name: '예시 데이터로 시작' }))
  await user.click(screen.getByRole('button', { name: /다음 기능/ }))
  expect(screen.getByLabelText('현재 주소').textContent).toBe('/map?present=1&step=1&demo=1')
  await user.click(screen.getByRole('button', { name: /다음 기능/ }))
  expect(screen.getByLabelText('현재 주소').textContent).toBe(
    '/?present=1&step=2&demo=1#robot-controls',
  )
})

it('실제 연결 발표는 시연 파라미터를 제거하고 가이드를 접어도 모드를 바꾸지 않는다', async () => {
  const user = open('/?demo=1&scenario=DANGER&run=123')
  await user.click(screen.getByRole('button', { name: '발표 시작' }))
  await user.click(screen.getByRole('button', { name: '실제 연결로 시작' }))
  expect(screen.getByLabelText('현재 주소').textContent).toBe('/?present=1&step=0')
  await user.click(screen.getByRole('button', { name: '발표 가이드 접기' }))
  expect(screen.getByLabelText('현재 주소').textContent).toBe('/')
})

it('단계를 벗어나는 주소를 열어도 첫 단계부터 안내한다', () => {
  open('/?present=1&step=999')
  expect(screen.getByText('1 / 7')).toBeTruthy()
})

it('다른 메뉴로 이동한 경우 실제 화면에 맞춰 발표 단계를 표시한다', () => {
  open('/reports?present=1&step=0')
  expect(screen.getByText('6 / 7')).toBeTruthy()
})
