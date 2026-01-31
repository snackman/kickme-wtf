import { useNavigate } from 'react-router-dom'
import type { HistoryEvent } from '../hooks/useHistory'
import { AddressDisplay } from './AddressDisplay'

type Props = {
  events: HistoryEvent[]
  isLoading: boolean
}

export function History({ events, isLoading }: Props) {
  const navigate = useNavigate()

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp * 1000)
    const now = new Date()
    const diff = now.getTime() - date.getTime()

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        Loading history...
      </div>
    )
  }

  if (events.length === 0) {
    return (
      <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>
        No activity yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {events.map((event, i) => (
        <div
          key={`${event.transactionHash}-${i}`}
          onClick={() => navigate(`/${event.victim}`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            padding: '12px 16px',
            background: '#2a2a4e',
            borderRadius: '8px',
            cursor: 'pointer',
          }}
        >
          <span style={{ fontSize: '24px' }}>
            {event.type === 'stuck' ? '🖐️' : '🦵'}
          </span>
          <div style={{ flex: 1 }}>
            <AddressDisplay address={event.actor} color="#ffeb3b" />
            <span style={{ color: '#888' }}>
              {event.type === 'stuck' ? ' stuck ' : ' kicked '}
            </span>
            <AddressDisplay address={event.victim} color="#4ade80" />
          </div>
          <span style={{ color: '#666', fontSize: '14px' }}>
            {formatTime(event.timestamp)}
          </span>
        </div>
      ))}
    </div>
  )
}
