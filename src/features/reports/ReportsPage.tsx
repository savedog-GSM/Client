import { useState } from 'react'
import type { ReportStatus } from '../../api/types'
import { useRobot } from '../../app/RobotProvider'
import { Empty, ErrorNotice, PageTitle, reportNames, time } from '../../components/ui'

import { hazardNames } from './reportLabels'
import ReportDetail from './ReportDetail'
import { sampleReports } from './sampleReports'

export default function ReportsPage() {
  const { reports, reportsError, reportsLoading, retry } = useRobot()
  const [filter, setFilter] = useState<ReportStatus | ''>('')
  const [selected, setSelected] = useState<number | null>(sampleReports[0].id)
  const allReports = [...sampleReports, ...reports]
  const filtered = allReports.filter((report) => !filter || report.status === filter)
  const sample = sampleReports.find((report) => report.id === selected)
  return (
    <>
      <PageTitle
        title="위험 신고"
        description="로보독이 감지한 위험을 확인하고 안전신문고 접수 결과를 기록합니다."
      />
      <ErrorNotice message={reportsError} retry={retry} />
      <div className="tabs" aria-label="신고 상태 필터">
        {(['', 'PENDING', 'SUBMITTED', 'DISMISSED', 'FAILED'] as const).map((status) => (
          <button key={status} aria-pressed={status === filter} onClick={() => setFilter(status)}>
            {status ? reportNames[status] : '전체'}
          </button>
        ))}
      </div>
      <div className="report-grid">
        <section className="panel">
          <div className="section-heading">
            <h2>신고 목록</h2>
            <span>{filtered.length}건</span>
          </div>
          {reportsLoading && reports.length === 0 ? (
            <Empty>신고를 불러오는 중입니다.</Empty>
          ) : filtered.length ? (
            filtered.map((report) => (
              <button
                className={`report-item ${selected === report.id ? 'selected' : ''}`}
                key={report.id}
                onClick={() => setSelected(report.id)}
              >
                <div className="section-heading">
                  <strong>
                    {hazardNames[report.hazardType]} #{report.id}
                  </strong>
                  <span className={`badge ${report.status.toLowerCase()}`}>
                    {reportNames[report.status]}
                  </span>
                </div>
                <p>
                  {report.address ??
                    `${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}`}
                </p>
                <small>{time(report.createdAt)}</small>
              </button>
            ))
          ) : (
            <Empty>표시할 신고가 없습니다.</Empty>
          )}
        </section>
        {selected !== null ? (
          <ReportDetail key={selected} id={selected} sample={sample} />
        ) : (
          <section className="panel">
            <Empty>목록에서 검토할 신고를 선택해주세요.</Empty>
          </section>
        )}
      </div>
    </>
  )
}
