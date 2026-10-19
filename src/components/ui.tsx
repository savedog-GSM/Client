import type { ReactNode } from 'react'
import type { Risk, ReportStatus } from '../api/types'

export const riskNames = { SAFE: '안전', CAUTION: '주의', DANGER: '위험' }
export const reportNames: Record<ReportStatus, string> = {
  PENDING: '승인 대기',
  SUBMITTED: '제출 완료',
  DISMISSED: '기각',
  FAILED: '제출 실패',
}
export function RiskBadge({ risk }: { risk: Risk | null }) {
  return (
    <span className={`badge ${risk?.level.toLowerCase() ?? 'unknown'}`}>
      {risk ? `${riskNames[risk.level]} · ${risk.score}점` : '수신 대기'}
    </span>
  )
}
export function PageTitle({
  title,
  description,
  action,
}: {
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="page-title">
      <div>
        <p className="eyebrow">SAVEDOG CONTROL</p>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}
export function ErrorNotice({ message, retry }: { message: string; retry?: () => void }) {
  if (!message) return null
  return (
    <div className="error-notice" role="alert">
      <span>{message}</span>
      {retry && <button onClick={retry}>다시 시도</button>}
    </div>
  )
}
export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>
}
export function time(value: string | null) {
  return value ? value.replace('T', ' ').replace(/\.\d+$/, '') : '수신 없음'
}
export function number(value: number | null | undefined, unit = '') {
  return value == null
    ? '값 없음'
    : `${value.toLocaleString('ko-KR', { maximumFractionDigits: 1 })}${unit}`
}
export function isFresh(value: string | null, now: number, seconds: number) {
  if (!value) return false
  const age = now - new Date(value).getTime()
  return Number.isFinite(age) && age >= -5000 && age <= seconds * 1000
}
