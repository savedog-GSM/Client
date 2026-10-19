import { useEffect, useRef, useState, type FormEvent } from 'react'
import type { ConnectionSettings } from '../api/types'

export default function ConnectionForm({
  settings,
  onSave,
  onClose,
}: {
  settings: ConnectionSettings
  onSave: (value: ConnectionSettings) => void
  onClose: () => void
}) {
  const [draft, setDraft] = useState(settings)
  const [error, setError] = useState('')
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    const element = dialog.current
    element?.showModal()
    return () => element?.close()
  }, [])
  function submit(event: FormEvent) {
    event.preventDefault()
    try {
      const url = new URL(draft.apiUrl)
      if (
        !['http:', 'https:'].includes(url.protocol) ||
        url.username ||
        url.password ||
        url.search ||
        url.hash
      )
        throw new Error()
      onSave({ ...draft, apiUrl: draft.apiUrl.trim().replace(/\/$/, '') })
      onClose()
    } catch {
      setError('http 또는 https로 시작하는 서버 주소를 입력해주세요.')
    }
  }
  return (
    <dialog ref={dialog} className="modal" aria-labelledby="connection-title" onCancel={onClose}>
      <h2 id="connection-title">서버 연결 설정</h2>
      <p>토큰은 현재 화면의 메모리에만 보관하며 새로고침하면 지워집니다.</p>
      <form onSubmit={submit}>
        <label>
          서버 주소
          <input
            autoFocus
            required
            type="url"
            value={draft.apiUrl}
            onChange={(e) => setDraft({ ...draft, apiUrl: e.target.value })}
          />
        </label>
        <label>
          관제 토큰
          <input
            type="password"
            autoComplete="off"
            value={draft.operatorToken}
            onChange={(e) => setDraft({ ...draft, operatorToken: e.target.value })}
          />
        </label>
        <label>
          장치 토큰
          <input
            type="password"
            autoComplete="off"
            value={draft.deviceToken}
            onChange={(e) => setDraft({ ...draft, deviceToken: e.target.value })}
          />
        </label>
        <p className="muted">
          서버에서 인증을 켠 경우 해당 토큰을 입력해주세요. 스마트폰 위치 전송에는 장치 토큰만
          사용합니다.
        </p>
        {error && <p role="alert">{error}</p>}
        <div className="actions">
          <button type="button" onClick={onClose}>
            취소
          </button>
          <button className="primary" type="submit">
            연결 적용
          </button>
        </div>
      </form>
    </dialog>
  )
}
