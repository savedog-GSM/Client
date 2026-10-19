import { useState } from 'react'
import type { CommandType } from '../../api/types'
import { errorMessage } from '../../api/client'
import { useRobot } from '../../app/RobotProvider'
import { ErrorNotice } from '../../components/ui'

const commands: { type: CommandType; name: string }[] = [
  { type: 'FORWARD', name: '전진' }, { type: 'BACKWARD', name: '후진' },
  { type: 'TURN_LEFT', name: '좌회전' }, { type: 'TURN_RIGHT', name: '우회전' },
  { type: 'SIT', name: '앉기' }, { type: 'BARK', name: '짖기' },
]
export default function RobotControls() {
  const { api, status, stream, statusError } = useRobot()
  const [speed, setSpeed] = useState(30)
  const [duration, setDuration] = useState(1000)
  const [pending, setPending] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const unavailable = !status.connected || stream !== 'connected' || !!statusError
  async function send(type: CommandType) {
    setPending(true)
    setError('')
    setMessage('')
    try {
      const moving = ['FORWARD', 'BACKWARD', 'TURN_LEFT', 'TURN_RIGHT'].includes(type)
      const result = await api.command(moving ? { type, speed, durationMs: duration } : { type })
      setMessage(`명령 #${result.commandId} 전송 완료. 실제 동작 여부는 로보독에서 확인해주세요.`)
    } catch (error) { setError(errorMessage(error)) }
    finally { setPending(false) }
  }
  return <section className="panel"><div className="section-heading"><div><h2>로보독 제어</h2><p>연결된 로보독에 동작을 요청합니다.</p></div><span className={`badge ${unavailable ? 'unknown' : 'safe'}`}>{unavailable ? '제어 불가' : '연결됨'}</span></div>
    <div className="control-inputs"><label>이동 속도 (%)<input type="number" min="0" max="100" value={speed} onChange={(e) => setSpeed(Number(e.target.value))} /></label><label>이동 시간 (ms)<input type="number" min="1" max="60000" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></label></div>
    <div className="command-grid">{commands.map((command) => <button key={command.type} disabled={pending || unavailable || !Number.isInteger(duration) || duration < 1 || duration > 60000 || !Number.isFinite(speed) || speed < 0 || speed > 100} onClick={() => void send(command.type)}>{command.name}</button>)}</div>
    <button className="stop-button" disabled={unavailable} onClick={() => void send('STOP')}>■ 즉시 멈추기</button>
    <ErrorNotice message={error} /><p className="muted" role="status">{message || '이동은 지정한 시간이 지나면 멈춥니다.'}</p>
  </section>
}
