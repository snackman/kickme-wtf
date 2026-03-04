import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { isAddress, getAddress, type Address } from 'viem'
import { KickMeSign } from '../components/KickMeSign'
import { Stats } from '../components/Stats'
import { ActionButtons } from '../components/ActionButtons'
import { History } from '../components/History'
import { useVictimStats } from '../hooks/useKickMe'
import { useHistory } from '../hooks/useHistory'
import { useEnsResolution } from '../hooks/useEnsResolution'
import { getEnsName, getCachedEnsName } from '../lib/ensCache'
import { randomSeed } from '../lib/signGenerator'

export function Victim() {
  const { address: addressParam } = useParams<{ address: string }>()
  const [signSeed] = useState(randomSeed)

  // Check if it's an ENS name or address
  const isEnsName = addressParam?.endsWith('.eth') ?? false
  const ensResolution = useEnsResolution(isEnsName ? addressParam! : '')

  // Determine the actual address
  const resolvedAddress = isEnsName
    ? (ensResolution.isValid && ensResolution.address ? ensResolution.address : null)
    : (addressParam && isAddress(addressParam) ? addressParam : null)

  const victimAddress = resolvedAddress ? getAddress(resolvedAddress) as Address : undefined

  // Reverse ENS lookup when navigated by address
  const [reverseEns, setReverseEns] = useState<string | null>(() =>
    victimAddress ? (getCachedEnsName(victimAddress) ?? null) : null
  )
  useEffect(() => {
    if (isEnsName || !victimAddress) return
    const cached = getCachedEnsName(victimAddress)
    if (cached !== undefined) { setReverseEns(cached); return }
    let cancelled = false
    getEnsName(victimAddress).then(name => { if (!cancelled) setReverseEns(name) })
    return () => { cancelled = true }
  }, [victimAddress, isEnsName])

  const displayName = isEnsName ? addressParam : (reverseEns || victimAddress)
  const hasEnsName = isEnsName || !!reverseEns

  // Always call hooks unconditionally
  const { hasSign, stickerCount, kickCount, signedAt, tokenId, isLoading, refetch } = useVictimStats(victimAddress)
  const { events, isLoading: historyLoading } = useHistory(victimAddress)

  // Now handle conditional rendering
  if (isEnsName && ensResolution.isLoading) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <p style={{ color: '#888' }}>Resolving {addressParam}...</p>
      </div>
    )
  }

  if (isEnsName && (!ensResolution.isValid || !ensResolution.address)) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#e74c3c' }}>{ensResolution.error || 'ENS name not found'}</h1>
        <p style={{ color: '#888', marginTop: '12px' }}>{addressParam}</p>
        <Link to="/" style={{ color: '#ffeb3b', marginTop: '20px', display: 'inline-block' }}>← Go back home</Link>
      </div>
    )
  }

  if (!victimAddress) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center' }}>
        <h1 style={{ color: '#e74c3c' }}>Invalid Address</h1>
        <Link to="/" style={{ color: '#ffeb3b' }}>← Go back home</Link>
      </div>
    )
  }

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
        <p style={{ color: '#ffeb3b', marginBottom: '8px', fontSize: '24px' }}>
          {displayName}
        </p>
        {hasEnsName && (
          <p style={{ color: '#666', marginBottom: '8px', fontFamily: 'monospace', fontSize: '12px' }}>
            {victimAddress}
          </p>
        )}
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
        <p style={{ color: '#ffeb3b', marginBottom: '8px', fontSize: '24px' }}>
          {displayName}
        </p>
        <p style={{ fontFamily: 'monospace', color: '#666', marginBottom: '20px', fontSize: hasEnsName ? '12px' : '14px', wordBreak: 'break-all' }}>
          {victimAddress}
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
