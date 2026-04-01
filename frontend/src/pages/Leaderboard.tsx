import { Link } from 'react-router-dom'
import type { Address } from 'viem'
import { AddressDisplay } from '../components/AddressDisplay'
import { useAllEvents } from '../hooks/useHistory'

function LeaderboardSection({ title, color, entries, unit, linkToVictim }: {
  title: string
  color: string
  entries: [string, number][]
  unit: string
  linkToVictim?: boolean
}) {
  const empty = unit === 'kicks' && !linkToVictim ? 'No kickers yet'
    : unit === 'kicks' ? 'No kicks yet'
    : unit === 'signs' ? 'No signs yet'
    : 'No stickers yet'

  return (
    <div>
      <h2 style={{ marginBottom: '20px', color }}>{title}</h2>
      {entries.length === 0 ? (
        <p style={{ color: '#888' }}>{empty}</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {entries.map(([addr, count], i) => {
            const content = (
              <>
                <span style={{ fontSize: '20px', width: '30px' }}>
                  {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}.`}
                </span>
                <span style={{ flex: 1 }}>
                  <AddressDisplay address={addr as Address} />
                </span>
                <span style={{ color: '#888' }}>{count} {count === 1 ? unit.replace(/s$/, '') : unit}</span>
              </>
            )
            const style = {
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '12px',
              background: '#2a2a4e',
              borderRadius: '8px',
              textDecoration: 'none' as const,
              color: 'inherit' as const,
            }
            return linkToVictim ? (
              <Link key={addr} to={`/${addr}`} style={style}>{content}</Link>
            ) : (
              <div key={addr} style={style}>{content}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}

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

  // Aggregate stick counts by sticker (who stuck the most signs)
  const sticksBySticker = events
    .filter((e) => e.type === 'stuck')
    .reduce(
      (acc, e) => {
        acc[e.actor] = (acc[e.actor] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  // Aggregate stick counts by victim (who got the most signs)
  const sticksByVictim = events
    .filter((e) => e.type === 'stuck')
    .reduce(
      (acc, e) => {
        acc[e.victim] = (acc[e.victim] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

  // Aggregate kick counts by kicker (who kicked the most)
  const kicksByKicker = events
    .filter((e) => e.type === 'kicked')
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

  const topStuck = Object.entries(sticksByVictim)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  const topKickers = Object.entries(kicksByKicker)
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <LeaderboardSection
              title="🎯 Most Stuck"
              color="#ff9800"
              entries={topStuck}
              unit="signs"
              linkToVictim
            />
            <LeaderboardSection
              title="🦵 Most Kicked"
              color="#d32f2f"
              entries={topKicked}
              unit="kicks"
              linkToVictim
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
            <LeaderboardSection
              title="🖐️ Top Stickers"
              color="#ffeb3b"
              entries={topStickers}
              unit="sticks"
            />
            <LeaderboardSection
              title="👢 Top Kickers"
              color="#f44336"
              entries={topKickers}
              unit="kicks"
            />
          </div>
        </div>
      )}
    </div>
  )
}
