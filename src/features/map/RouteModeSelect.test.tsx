import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { expect, it, vi } from 'vitest'
import RouteModeSelect from './RouteModeSelect'

it('선택한 옵션을 표시하고 클릭으로 변경한 뒤 닫는다', async () => {
  const change = vi.fn()
  render(<RouteModeSelect value="SAFEST" onChange={change} />)
  const trigger = screen.getByRole('combobox', { name: '탐색 방식' })
  await userEvent.click(trigger)
  expect(screen.getByRole('option', { name: /안전 우선/ }).getAttribute('aria-selected')).toBe(
    'true',
  )
  await userEvent.click(screen.getByRole('option', { name: /최단 거리/ }))
  expect(change).toHaveBeenCalledWith('SHORTEST')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(document.activeElement).toBe(trigger)
})
it('키보드로 옵션을 고르고 Escape로 닫는다', async () => {
  const change = vi.fn()
  render(<RouteModeSelect value="SAFEST" onChange={change} />)
  screen.getByRole('combobox').focus()
  await userEvent.keyboard('{ArrowDown}{End}{Enter}')
  expect(change).toHaveBeenCalledWith('SHORTEST')
  await userEvent.keyboard('{Enter}{Escape}')
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(change).toHaveBeenCalledTimes(1)
})
it('바깥 클릭과 Tab 이동으로 닫는다', async () => {
  render(
    <>
      <RouteModeSelect value="SAFEST" onChange={vi.fn()} />
      <button>다음</button>
    </>,
  )
  const trigger = screen.getByRole('combobox')
  await userEvent.click(trigger)
  await userEvent.click(screen.getByRole('button', { name: '다음' }))
  expect(screen.queryByRole('listbox')).toBeNull()
  await userEvent.click(trigger)
  await userEvent.tab()
  expect(screen.queryByRole('listbox')).toBeNull()
  expect(document.activeElement).toBe(screen.getByRole('button', { name: '다음' }))
})
