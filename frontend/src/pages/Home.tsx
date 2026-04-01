import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Address } from 'viem'
import { AddressInput } from '../components/AddressInput'
import { ActionButtons } from '../components/ActionButtons'
import { History } from '../components/History'
import { SignPreview } from '../components/SignPreview'
import { useVictimStats } from '../hooks/useKickMe'
import { useRecentActivity } from '../hooks/useHistory'
import { randomSeed } from '../lib/signGenerator'

export function Home() {
  const navigate = useNavigate()
  const [targetAddress, setTargetAddress] = useState<Address | null>(null)
  const [signSeed, setSignSeed] = useState(randomSeed)
  const { hasSign, signCount, kickCount, isLoading, refetch } = useVictimStats(targetAddress ?? undefined)
  const { events: recentEvents, isLoading: recentLoading, refetch: refetchRecent } = useRecentActivity()

  const handleAddressResolved = useCallback((address: Address | null) => {
    setTargetAddress(address)
  }, [])

  return (
    <div style={{ padding: '40px 20px', maxWidth: '600px', margin: '0 auto' }}>
      <div style={{ marginBottom: '24px' }}>
        <SignPreview size="100%" seed={signSeed} onSeedChange={setSignSeed} />
      </div>
      <h1 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '48px' }}>
        🦶 Kick Me
      </h1>
      <p style={{ textAlign: 'center', color: '#888', marginBottom: '40px' }}>
        Stick a permanent Kick Me sign on any wallet.
      </p>

      <AddressInput onAddressResolved={handleAddressResolved} />

      {targetAddress && (
        <div style={{ marginTop: '32px' }}>
          {isLoading ? (
            <p style={{ textAlign: 'center', color: '#888' }}>Checking wallet...</p>
          ) : hasSign ? (
            <div style={{ textAlign: 'center' }}>
              <div
                onClick={() => navigate(`/${targetAddress}`)}
                style={{
                  background: '#2a2a4e',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '20px',
                  cursor: 'pointer',
                }}
              >
                <p style={{ color: '#ffeb3b', marginBottom: '8px' }}>
                  🎯 This wallet has a Kick Me sign!
                </p>
                <p style={{ color: '#888', fontSize: '14px' }}>
                  👥 {signCount?.toString() ?? '0'} signs · 🦶 {kickCount?.toString() ?? '0'} kicks
                </p>
                <p style={{ color: '#666', fontSize: '12px', marginTop: '8px' }}>
                  Click to view full details →
                </p>
              </div>
              <ActionButtons victim={targetAddress} hasSign={true} signSeed={signSeed} onSuccess={() => { refetch(); refetchRecent(); }} />
            </div>
          ) : (
            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#888', marginBottom: '20px' }}>
                ✨ This wallet is clean... for now
              </p>
              <ActionButtons victim={targetAddress} hasSign={false} signSeed={signSeed} onSuccess={() => { refetch(); refetchRecent(); }} />
            </div>
          )}
        </div>
      )}

      <div style={{ marginTop: '60px' }}>
        <h2 style={{ marginBottom: '20px', fontSize: '20px', color: '#888' }}>
          Recent Activity
        </h2>
        <History events={recentEvents} isLoading={recentLoading} />
      </div>
    </div>
  )
}
