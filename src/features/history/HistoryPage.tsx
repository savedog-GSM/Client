import { useEffect, useState, type FormEvent } from 'react'
import type { Telemetry } from '../../api/types'
import { errorMessage } from '../../api/client'
import { useRobot } from '../../app/RobotProvider'
import { Empty, ErrorNotice, number, PageTitle, RiskBadge, time } from '../../components/ui'
import HistoryLocation from './HistoryLocation'

export default function HistoryPage() {
  const { api } = useRobot()
  const [range, setRange] = useState({ from: '', to: '' })
  const [query, setQuery] = useState({ from: '', to: '', revision: 0 })
  const [records, setRecords] = useState<Telemetry[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setError('')
    api
      .telemetry(query.from, query.to, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) {
          setRecords(
            [...data].sort(
              (a, b) =>
                (Date.parse(b.recordedAt) || 0) - (Date.parse(a.recordedAt) || 0) || b.id - a.id,
            ),
          )
          setPage(0)
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) {
          setError(errorMessage(error))
          setRecords([])
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [api, query])
  function search(event: FormEvent) {
    event.preventDefault()
    if (range.from && range.to && range.from > range.to) {
      setError('시작 시각은 종료 시각보다 빨라야 합니다.')
      return
    }
    setQuery({ ...range, revision: query.revision + 1 })
  }
  return (
    <>
      <PageTitle
        title="이동 기록"
        description="서버에 저장된 센서와 위험도 기록을 최신순으로 조회합니다."
      />
      <form className="panel filter-form" onSubmit={search}>
        <label>
          시작 시각
          <input
            type="datetime-local"
            value={range.from}
            onChange={(e) => setRange({ ...range, from: e.target.value })}
          />
        </label>
        <label>
          종료 시각
          <input
            type="datetime-local"
            value={range.to}
            onChange={(e) => setRange({ ...range, to: e.target.value })}
          />
        </label>
        <button className="primary" disabled={loading}>
          조회
        </button>
        <p className="muted">
          기간 미지정 시 최근 1,000건, 기간 지정 시 최대 10,000건 · 시각은 서버 기준
        </p>
      </form>
      <ErrorNotice
        message={error}
        retry={() => setQuery({ ...query, revision: query.revision + 1 })}
      />
      <HistoryLocation api={api} />
      <section className="panel">
        <div className="section-heading">
          <h2>센서 기록 · 최신순</h2>
          <span>{records.length.toLocaleString()}건</span>
        </div>
        {loading ? (
          <Empty>기록을 불러오는 중입니다.</Empty>
        ) : records.length ? (
          <>
            <div className="table-scroll">
              <table>
                <thead>
                  <tr>
                    <th>수신 시각</th>
                    <th>거리</th>
                    <th>온도 / 습도</th>
                    <th>위험도</th>
                    <th>위도</th>
                    <th>경도</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(page * 50, (page + 1) * 50).map((record) => (
                    <tr key={record.id}>
                      <td>{time(record.recordedAt)}</td>
                      <td>{number(record.sensor.distance, ' cm')}</td>
                      <td>
                        {number(record.sensor.temperature, '°C')} /{' '}
                        {number(record.sensor.humidity, '%')}
                      </td>
                      <td>
                        <RiskBadge risk={record.risk} />
                      </td>
                      <td>{record.latitude?.toFixed(6) ?? '수신 당시 위치 없음'}</td>
                      <td>{record.longitude?.toFixed(6) ?? '수신 당시 위치 없음'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="pagination">
              <button disabled={page === 0} onClick={() => setPage(page - 1)}>
                이전
              </button>
              <span>
                {page + 1} / {Math.ceil(records.length / 50)}
              </span>
              <button
                disabled={(page + 1) * 50 >= records.length}
                onClick={() => setPage(page + 1)}
              >
                다음
              </button>
            </div>
          </>
        ) : (
          <Empty>해당 기간에 저장된 기록이 없습니다.</Empty>
        )}
      </section>
    </>
  )
}
