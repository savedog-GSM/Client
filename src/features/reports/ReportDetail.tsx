import { Empty, ErrorNotice, reportNames, RiskBadge, time } from '../../components/ui'
import { hazardNames } from './reportLabels'
import { useReportDetail } from './useReportDetail'

export default function ReportDetail({ id }: { id: number }) {
  const {
    current,
    error,
    photo,
    photoError,
    hasPhoto,
    receipt,
    setReceipt,
    pending,
    action,
    setAction,
    message,
    canProcess,
    validReceipt,
    processReport,
    retry,
    handlePhotoError,
  } = useReportDetail(id)
  return (
    <section className="panel report-detail">
      <ErrorNotice message={error} retry={retry} />
      {!current ? (
        <Empty>{error ? '신고를 불러오지 못했습니다.' : '상세 내용을 불러오는 중입니다.'}</Empty>
      ) : (
        <>
          <div className="section-heading">
            <h2>
              {hazardNames[current.hazardType]} #{current.id}
            </h2>
            <RiskBadge risk={current.risk} />
          </div>
          <span className={`badge ${current.status.toLowerCase()}`}>
            {reportNames[current.status]}
          </span>
          <p className="report-description">{current.description}</p>
          <dl className="details">
            <div>
              <dt>주소</dt>
              <dd>{current.address ?? '주소 정보 없음'}</dd>
            </div>
            <div>
              <dt>좌표</dt>
              <dd>
                {current.latitude}, {current.longitude}
              </dd>
            </div>
            <div>
              <dt>위험 사유</dt>
              <dd>{current.risk.reason ?? '없음'}</dd>
            </div>
            <div>
              <dt>생성 시각</dt>
              <dd>{time(current.createdAt)}</dd>
            </div>
            <div>
              <dt>제출 시각</dt>
              <dd>{time(current.submittedAt)}</dd>
            </div>
            <div>
              <dt>접수번호</dt>
              <dd>{current.receiptNumber ?? '미등록'}</dd>
            </div>
          </dl>
          {hasPhoto ? (
            photo ? (
              <img
                className="report-photo"
                src={photo}
                alt={`신고 #${id} 현장 사진`}
                onError={handlePhotoError}
              />
            ) : (
              <p className="muted">{photoError || '사진을 불러오는 중입니다.'}</p>
            )
          ) : (
            <p className="muted">첨부 사진이 없습니다.</p>
          )}
          {canProcess && (
            <div className="report-processing">
              <h3>신고 검토</h3>
              <p>민원 창구에 직접 접수한 뒤 받은 접수번호를 등록해주세요.</p>
              <label>
                접수번호
                <input
                  value={receipt}
                  maxLength={100}
                  disabled={pending}
                  onChange={(e) => {
                    setReceipt(e.target.value)
                    setAction(null)
                  }}
                  placeholder="민원 창구에서 받은 접수번호"
                />
              </label>
              <div className="actions">
                <button disabled={pending} onClick={() => setAction('dismiss')}>
                  기각
                </button>
                <button
                  className="primary"
                  disabled={pending || !validReceipt}
                  onClick={() => setAction('submit')}
                >
                  접수번호 등록
                </button>
              </div>
              {action && (
                <div className="confirm-box">
                  <p>
                    {action === 'submit'
                      ? `접수번호 ${receipt.trim()}로 제출 완료 처리할까요?`
                      : '이 신고를 검토하고 기각할까요?'}
                  </p>
                  <div className="actions">
                    <button disabled={pending} onClick={() => setAction(null)}>
                      취소
                    </button>
                    <button
                      className="primary"
                      disabled={pending || (action === 'submit' && !validReceipt)}
                      onClick={() => void processReport()}
                    >
                      {pending ? '처리 중…' : '확인'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
          <p role="status" className="muted">
            {message}
          </p>
        </>
      )}
    </section>
  )
}
