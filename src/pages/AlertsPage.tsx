import { useMemo, useState } from 'react'
import AlertCard from '../components/AlertCard'
import type { Alert } from '../types'
import { getAlerts } from '../utils/storage'

export default function AlertsPage() {
  const [alerts, setAlerts] = useState<Alert[]>(getAlerts())
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 5
  const totalPages = Math.max(1, Math.ceil(alerts.length / itemsPerPage))
  const visibleAlerts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage
    return alerts.slice(start, start + itemsPerPage)
  }, [alerts, currentPage])
  const pageNumbers = Array.from({ length: Math.min(4, totalPages) }, (_, index) => {
    if (totalPages <= 4) return index + 1
    if (currentPage <= 2) return index + 1
    if (currentPage >= totalPages - 1) return totalPages - 3 + index
    return currentPage - 1 + index
  })

  const clearAlerts = () => {
    localStorage.removeItem('robodog_alerts')
    setAlerts([])
    setCurrentPage(1)
  }

  const dangerCount = alerts.filter((alert) => alert.level === 'danger').length
  const warningCount = alerts.filter((alert) => alert.level === 'warning').length

  return (
    <div className="space-y-6">
      <section className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink">위험 알림</h1>
          <p className="mt-2 text-sm text-ink-muted">센서가 감지한 위험 상황을 시간순으로 확인할 수 있습니다.</p>
        </div>
        <button onClick={clearAlerts} className="rounded-lg border border-line bg-surface px-4 py-2.5 text-xs font-semibold text-ink-muted hover:bg-muted-bg">알림 기록 삭제</button>
      </section>

      <div className="grid gap-3 sm:grid-cols-3">
        <Summary title="전체 알림" value={`${alerts.length}건`} />
        <Summary title="위험" value={`${dangerCount}건`} danger />
        <Summary title="주의" value={`${warningCount}건`} />
      </div>

      <div>
        {alerts.length === 0 ? (
          <div className="min-h-[570px] rounded-xl border border-dashed border-line bg-surface p-12 text-center text-sm font-medium text-ink-faint">현재 저장된 위험 알림이 없습니다.</div>
        ) : (
          <>
            <div className="grid min-h-[570px] grid-rows-6 gap-2.5">
              {Array.from({ length: itemsPerPage }, (_, index) => {
                const alert = visibleAlerts[index]
                return alert ? (
                  <AlertCard key={alert.id} alert={alert} />
                ) : (
                  <div key={`empty-${index}`} aria-hidden="true" />
                )
              })}
            </div>

            {totalPages > 1 && (
              <nav className="flex h-0 items-end justify-center gap-1 pt-0" aria-label="알림 페이지">
                <button
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-ink-muted transition hover:bg-muted-bg disabled:cursor-default disabled:opacity-40"
                  aria-label="이전 페이지"
                >
                  &lt;
                </button>
                {pageNumbers.map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`flex h-9 w-9 items-center justify-center rounded-lg text-sm font-semibold transition ${currentPage === page ? 'bg-accent text-white' : 'text-ink-muted hover:bg-muted-bg'}`}
                    aria-current={currentPage === page ? 'page' : undefined}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium text-ink-muted transition hover:bg-muted-bg disabled:cursor-default disabled:opacity-40"
                  aria-label="다음 페이지"
                >
                  &gt;
                </button>
              </nav>
            )}
          </>
        )}
      </div>
    </div>
  )
}

function Summary({ title, value, danger = false }: { title: string; value: string; danger?: boolean }) {
  return (
    <div className="rounded-xl border border-line bg-surface p-5">
      <p className="text-xs font-medium text-ink-muted">{title}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${danger ? 'text-red-600' : 'text-ink'}`}>{value}</p>
    </div>
  )
}
