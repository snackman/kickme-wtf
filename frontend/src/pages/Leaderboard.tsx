import { Link } from 'react-router-dom'
import { useAllEvents } from '../hooks/useHistory'
import { AddressDisplay } from '../components/AddressDisplay'
import type { Address } from 'viem'

export function Leaderboard() {
  const { events, isLoading } = useAllEvents()

  // Aggregate kick counts by victim
  const kicksByVictim = events
    .filter((e) => e.type === 'kicked')
    .reduce(
      (acc, e) => {
        acc[e.victim] = (acc[e.victim] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  // Aggregate stick counts by sticker
  const sticksBySticker = events
    .filter((e) => e.type === 'stuck')
    .reduce(
      (acc, e) => {
        acc[e.actor] = (acc[e.actor] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  const topKicked = Object.entries(kicksByVictim)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const topStickers = Object.entries(sticksBySticker)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  return (
    <div style={{ padding: '40px 20px', maxWidth: '800px', margin: '0 auto' }}>
      <Link to="/" style={{ color: '#888', textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
        ← Back
      </Link>

      <h1 style={{ textAlign: 'center', marginBottom: '40px' }}>🏆 Leaderboard</h1>

      {isLoading ? (
        <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px' }}>
          <div>
            <h2 style={{ marginBottom: '20px', color: '#d32f2f' }}>🦵 Most Kicked</h2>
            {topKicked.length === 0 ? (
              <p style={{ color: '#888' }}>No kicks yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topKicked.map(([addr, count], i) => (
                  <Link
                    key={addr}
                    to={`/${addr}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#2a2a4e',
                      borderRadius: '8px',
                      textDecoration: 'none',
                      color: 'inherit',
                    }}
                  >
                    <span style={{ fontSize: '20px', width: '30px' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span style={{ flex: 1 }}>
                      <AddressDisplay address={addr as Address} />
                    </span>
                    <span style={{ color: '#888' }}>{count} kicks</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div>
            <h2 style={{ marginBottom: '20px', color: '#ffeb3b' }}>🖐️ Top Stickers</h2>
            {topStickers.length === 0 ? (
              <p style={{ color: '#888' }}>No stickers yet</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {topStickers.map(([addr, count], i) => (
                  <div
                    key={addr}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '12px',
                      background: '#2a2a4e',
                      borderRadius: '8px',
                    }}
                  >
                    <span style={{ fontSize: '20px', width: '30px' }}>
                      {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                    </span>
                    <span style={{ flex: 1 }}>
                      <AddressDisplay address={addr as Address} />
                    </span>
                    <span style={{ color: '#888' }}>{count} sticks</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
