import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { expect, it } from 'vitest'
import DemoActions from './DemoActions'

function Address() {
  const location = useLocation()
  return (
    <output>
      {location.pathname}
      {location.search}
      {location.hash}
    </output>
  )
}

it('실제 모드에서는 예시 위험 상황 버튼을 노출하지 않는다', () => {
  render(
    <MemoryRouter>
      <DemoActions />
    </MemoryRouter>,
  )
  expect(screen.queryByLabelText('위험 상황 시연')).toBeNull()
})

it('위험 선택과 신고 이동 후에도 시연·발표 설정을 유지한다', async () => {
  const user = userEvent.setup()
  render(
    <MemoryRouter initialEntries={['/?demo=1&present=1&step=0']}>
      <DemoActions />
      <Address />
    </MemoryRouter>,
  )
  await user.click(screen.getByRole('button', { name: /위험 자동 정지/ }))
  expect(screen.getByRole('button', { name: /위험 자동 정지/ }).getAttribute('aria-pressed')).toBe(
    'true',
  )
  await user.click(screen.getByRole('link', { name: /신고 처리/ }))
  expect(screen.getByRole('status').textContent).toBe(
    '/reports?demo=1&present=1&step=0&scenario=DANGER',
  )
})
