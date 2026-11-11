import { useState, type ChangeEvent } from 'react'
import type { OwnerFaceResult } from '../../api/types'
import type { Api } from '../../api/client'
import { errorMessage } from '../../api/client'
import { number, time } from '../../components/ui'

export default function FaceManager({
  api,
  registeredFaces,
  disabled,
  onChange,
}: {
  api: Api
  registeredFaces: number
  disabled: boolean
  onChange: () => void
}) {
  const [file, setFile] = useState<File | null>(null)
  const [result, setResult] = useState<OwnerFaceResult | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    setFile(event.target.files?.[0] ?? null)
    setResult(null)
    setError('')
  }

  const register = async () => {
    if (!file) return
    setBusy(true)
    setError('')
    try {
      setResult(await api.registerOwnerFace(file))
      setFile(null)
      onChange()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  const removeAll = async () => {
    if (!window.confirm('등록된 주인 얼굴을 모두 삭제할까요?')) return
    setBusy(true)
    setError('')
    try {
      await api.deleteOwnerFaces()
      setResult(null)
      onChange()
    } catch (requestError) {
      setError(errorMessage(requestError))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel owner-card">
      <div className="section-heading">
        <div>
          <h2>주인 얼굴 등록</h2>
          <p>정면 얼굴이 선명하게 나온 사진을 한 장 선택해주세요.</p>
        </div>
        <span className="count">{registeredFaces}장 등록</span>
      </div>
      <label className="owner-file">
        얼굴 사진
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
      </label>
      {file && <p className="owner-file-name">선택한 사진: {file.name}</p>}
      {error && (
        <div className="error-notice" role="alert">
          {error}
        </div>
      )}
      {result && (
        <div className="owner-result" role="status">
          <strong>얼굴 #{result.id} 등록 완료</strong>
          <span>얼굴 인식 확신도 {number(result.faceScore * 100, '%')}</span>
          <span>등록 시각 {time(result.createdAt)}</span>
        </div>
      )}
      <div className="actions owner-actions">
        <button onClick={removeAll} disabled={busy || disabled || registeredFaces === 0}>
          전체 삭제
        </button>
        <button className="primary" onClick={register} disabled={busy || disabled || !file}>
          {busy ? '처리 중' : '얼굴 등록'}
        </button>
      </div>
    </section>
  )
}
