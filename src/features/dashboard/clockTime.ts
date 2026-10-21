export function clockTime(value: string | null) {
  if (!value) return '수신 없음'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '시각 확인 불가'
  return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
}
