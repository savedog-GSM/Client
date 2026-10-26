import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, it, vi } from 'vitest'
import ConnectionForm from './ConnectionForm'
import { settings } from '../test/fixtures'

const showModal = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'showModal')
const close = Object.getOwnPropertyDescriptor(HTMLDialogElement.prototype, 'close')
afterEach(() => {
  cleanup()
  for (const [name, descriptor] of [
    ['showModal', showModal],
    ['close', close],
  ] as const) {
    if (descriptor) Object.defineProperty(HTMLDialogElement.prototype, name, descriptor)
    else Reflect.deleteProperty(HTMLDialogElement.prototype, name)
  }
})

it('Bearer 접두사와 토큰 앞뒤 공백을 제거해 적용한다', async () => {
  Object.defineProperties(HTMLDialogElement.prototype, {
    showModal: {
      configurable: true,
      value() {
        this.setAttribute('open', '')
      },
    },
    close: {
      configurable: true,
      value() {
        this.removeAttribute('open')
      },
    },
  })
  const onSave = vi.fn()
  render(<ConnectionForm settings={settings} onSave={onSave} onClose={vi.fn()} />)
  fireEvent.change(screen.getByLabelText('관제 토큰'), {
    target: { value: ' Bearer operator-test ' },
  })
  fireEvent.change(screen.getByLabelText('장치 토큰'), { target: { value: ' device-test ' } })
  await userEvent.click(screen.getByRole('button', { name: '연결 적용' }))
  expect(onSave).toHaveBeenCalledWith({
    ...settings,
    operatorToken: 'operator-test',
    deviceToken: 'device-test',
  })
})
