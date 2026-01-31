import { useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isAddress, getAddress, type Address } from 'viem'
import { KickMeSign } from '../components/KickMeSign'
import { Stats } from '../components/Stats'
import { ActionButtons } from '../components/ActionButtons'
import { History } from '../components/History'
import { useVictimStats } from '../hooks/useKickMe'
import { useHistory } from '../hooks/useHistory'
import { randomSeed } from '../lib/signGenerator'

export function Victim() {
  const { address } = useParams<{ address: string }>()
  const [signSeed] = useState(randomSeed)

  // Validate address
  if (!address || !isAddress(address)) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#e74c3c' }}>Invalid Address</h1>
        <Link to="/" style={{ color: '#ffeb3b' }}>← Go back home</Link>
      </div>
    )
  }

  const victimAddress = getAddress(address) as Address
  const { hasSign, stickerCount, kickCount, signedAt, tokenId, isLoading, refetch } = useVictimStats(victimAddress)
  const { events, isLoading: historyLoading } = useHistory(victimAddress)

  if (isLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Loading...</p>
      </div>
    )
  }

  if (!hasSign) {
    return (
      <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <h1 style={{ marginBottom: '20px' }}>No Sign Found</h1>
        <p style={{ color: '#888', marginBottom: '8px', fontFamily: 'monospace' }}>
          {address}
        </p>
        <p style={{ color: '#888', marginBottom: '32px' }}>
          This wallet doesn't have a Kick Me sign yet.
        </p>
        <ActionButtons victim={victimAddress} hasSign={false} signSeed={signSeed} onSuccess={refetch} />
        <div style={{ marginTop: '32px' }}>
          <Link to="/" style={{ color: '#ffeb3b' }}>← Go back home</Link>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
      <Link to="/" style={{ color: '#888', textDecoration: 'none', display: 'block', marginBottom: '20px' }}>
        ← Back
      </Link>

      <div style={{ textAlign: 'center', marginBottom: '32px' }}>
        <p style={{ fontFamily: 'monospace', color: '#888', marginBottom: '20px', wordBreak: 'break-all' }}>
          {address}
        </p>
        <KickMeSign tokenId={tokenId} size={280} />
      </div>

      <div style={{ marginBottom: '32px' }}>
        <Stats stickerCount={stickerCount} kickCount={kickCount} signedAt={signedAt} />
      </div>

      <div style={{ marginBottom: '40px' }}>
        <ActionButtons victim={victimAddress} hasSign={true} signSeed={signSeed} onSuccess={refetch} />
      </div>

      <div>
        <h2 style={{ marginBottom: '20px', fontSize: '20px', color: '#888' }}>
          History
        </h2>
        <History events={events} isLoading={historyLoading} />
      </div>
    </div>
  )
}
