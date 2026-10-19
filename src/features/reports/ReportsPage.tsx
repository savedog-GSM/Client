import { useEffect, useState } from 'react'
import { errorMessage } from '../../api/client'
import type { Report, ReportStatus } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { Empty, ErrorNotice, PageTitle, reportNames, RiskBadge, time } from '../../components/ui'

const hazardNames = { OBSTACLE: '장애물', ROUGH_ROAD: '위험한 길', ETC: '기타' }
export default function ReportsPage() {
  const { reports, reportsError, reportsLoading, retry } = useRobot()
  const [filter, setFilter] = useState<ReportStatus | ''>('')
  const [selected, setSelected] = useState<number | null>(null)
  const filtered = reports.filter((report) => !filter || report.status === filter)
  return <><PageTitle title="위험 신고" description="자동으로 생성된 신고를 검토하고 처리 상태를 관리합니다." />
    <ErrorNotice message={reportsError} retry={retry} />
    <div className="tabs" aria-label="신고 상태 필터">{(['', 'PENDING', 'SUBMITTED', 'DISMISSED', 'FAILED'] as const).map((status) => <button key={status} aria-pressed={status === filter} onClick={() => setFilter(status)}>{status ? reportNames[status] : '전체'}</button>)}</div>
    <div className="report-grid"><section className="panel"><div className="section-heading"><h2>신고 목록</h2><span>{filtered.length}건</span></div>{reportsLoading ? <Empty>신고를 불러오는 중입니다.</Empty> : filtered.length ? filtered.map((report) => <button className={`report-item ${selected === report.id ? 'selected' : ''}`} key={report.id} onClick={() => setSelected(report.id)}><div className="section-heading"><strong>{hazardNames[report.hazardType]} #{report.id}</strong><span className={`badge ${report.status.toLowerCase()}`}>{reportNames[report.status]}</span></div><p>{report.address ?? `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}</p><small>{time(report.createdAt)}</small></button>) : <Empty>표시할 신고가 없습니다.</Empty>}</section>
    {selected !== null ? <ReportDetail key={selected} id={selected} /> : <section className="panel"><Empty>목록에서 검토할 신고를 선택해주세요.</Empty></section>}</div>
  </>
}

export function ReportDetail({ id }: { id: number }) {
  const { api, reports, updateReport } = useRobot()
  const liveReport = reports.find((report) => report.id === id)
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [photo, setPhoto] = useState('')
  const [photoError, setPhotoError] = useState('')
  const [receipt, setReceipt] = useState('')
  const [pending, setPending] = useState(false)
  const [action, setAction] = useState<'submit' | 'dismiss' | null>(null)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  useEffect(() => {
    let active = true
    setError('')
    api.report(id).then((data) => { if (active) setReport(data) }).catch((error) => { if (active) setError(errorMessage(error)) })
    return () => { active = false }
  }, [api, id, revision, liveReport])
  const hasPhoto = report?.hasPhoto ?? false
  useEffect(() => {
    if (!hasPhoto) return
    let active = true
    const load = () => api.photo(id).then((result) => { if (active) { setPhoto(result.url); setPhotoError('') } }).catch((error) => { if (active) { setPhoto(''); setPhotoError(errorMessage(error)) } })
    void load()
    const timer = setInterval(() => void load(), 240000)
    return () => { active = false; clearInterval(timer) }
  }, [api, id, hasPhoto, revision])
  async function process() {
    if (!report || !action) return
    setPending(true)
    setError('')
    try {
      const result = action === 'submit' ? await api.submit(id, receipt.trim()) : await api.dismiss(id)
      setReport(result)
      updateReport(result)
      setMessage(action === 'submit' ? '접수번호를 기록했습니다.' : '신고를 기각했습니다.')
      setAction(null)
    } catch (error) {
      setError(errorMessage(error))
      setAction(null)
      try { const latest = await api.report(id); setReport(latest); updateReport(latest) } catch { setMessage('최신 처리 상태를 확인하려면 다시 조회해주세요.') }
    } finally { setPending(false) }
  }
  const current = liveReport && report && liveReport.status !== report.status ? liveReport : report
  const canProcess = current && ['PENDING', 'FAILED'].includes(current.status)
  const validReceipt = !!receipt.trim() && receipt.trim().length <= 100 && !/[\u0000-\u001f\u007f]/.test(receipt)
  return <section className="panel report-detail"><ErrorNotice message={error} retry={() => setRevision(revision + 1)} />{!current ? <Empty>{error ? '신고를 불러오지 못했습니다.' : '상세 내용을 불러오는 중입니다.'}</Empty> : <>
    <div className="section-heading"><h2>{hazardNames[current.hazardType]} #{current.id}</h2><RiskBadge risk={current.risk} /></div>
    <span className={`badge ${current.status.toLowerCase()}`}>{reportNames[current.status]}</span><p className="report-description">{current.description}</p>
    <dl className="details"><div><dt>주소</dt><dd>{current.address ?? '주소 정보 없음'}</dd></div><div><dt>좌표</dt><dd>{current.latitude}, {current.longitude}</dd></div><div><dt>위험 사유</dt><dd>{current.risk.reason ?? '없음'}</dd></div><div><dt>생성 시각</dt><dd>{time(current.createdAt)}</dd></div><div><dt>제출 시각</dt><dd>{time(current.submittedAt)}</dd></div><div><dt>접수번호</dt><dd>{current.receiptNumber ?? '미등록'}</dd></div></dl>
    {hasPhoto ? photo ? <img className="report-photo" src={photo} alt={`신고 #${id} 현장 사진`} onError={() => { setPhoto(''); setPhotoError('사진을 불러오지 못했습니다.') }} /> : <p className="muted">{photoError || '사진을 불러오는 중입니다.'}</p> : <p className="muted">첨부 사진이 없습니다.</p>}
    {canProcess && <div className="report-processing"><h3>신고 검토</h3><p>민원 창구에 직접 접수한 뒤 받은 접수번호를 등록해주세요.</p><label>접수번호<input value={receipt} maxLength={100} disabled={pending} onChange={(e) => { setReceipt(e.target.value); setAction(null) }} placeholder="민원 창구에서 받은 접수번호" /></label><div className="actions"><button disabled={pending} onClick={() => setAction('dismiss')}>기각</button><button className="primary" disabled={pending || !validReceipt} onClick={() => setAction('submit')}>접수번호 등록</button></div>
      {action && <div className="confirm-box"><p>{action === 'submit' ? `접수번호 ${receipt.trim()}로 제출 완료 처리할까요?` : '이 신고를 검토하고 기각할까요?'}</p><div className="actions"><button disabled={pending} onClick={() => setAction(null)}>취소</button><button className="primary" disabled={pending || (action === 'submit' && !validReceipt)} onClick={() => void process()}>{pending ? '처리 중…' : '확인'}</button></div></div>}
    </div>}
    <p role="status" className="muted">{message}</p>
  </>}</section>
}
