import { useEffect, useState, useRef } from 'react'
import { useAccount } from 'wagmi'
import { formatEther } from 'viem'
import { useStick, useKick, useVictimStats } from '../hooks/useKickMe'
import { KICKME_ADDRESS, STICK_PRICE, KICK_PRICE } from '../lib/contract'
import type { Address } from 'viem'

type Props = {
  victim: Address
  hasSign: boolean
  signSeed: number
  onSuccess?: () => void
}

export function ActionButtons({ victim, hasSign, signSeed, onSuccess }: Props) {
  const { isConnected } = useAccount()
  const { stick, isPending: stickPending, isConfirming: stickConfirming, isSuccess: stickSuccess, hash: stickHash } = useStick()
  const { kick, isPending: kickPending, isConfirming: kickConfirming, isSuccess: kickSuccess } = useKick()
  const { tokenIds, refetch } = useVictimStats(victim)
  const [showSuccess, setShowSuccess] = useState(false)
  const [successTokenId, setSuccessTokenId] = useState<bigint | null>(null)
  const hasHandledSuccess = useRef(false)

  // Handle successful stick
  useEffect(() => {
    if (stickSuccess && !hasHandledSuccess.current) {
      hasHandledSuccess.current = true
      // Wait a bit for the blockchain to index, then refetch
      setTimeout(async () => {
        await refetch()
        setShowSuccess(true)
        onSuccess?.()
      }, 2000)
    }
  }, [stickSuccess, onSuccess, refetch])

  // Update tokenId when tokenIds change (use the latest/last one)
  useEffect(() => {
    if (tokenIds && tokenIds.length > 0) {
      setSuccessTokenId(tokenIds[tokenIds.length - 1])
    }
  }, [tokenIds])

  // Handle successful kick
  useEffect(() => {
    if (kickSuccess) {
      refetch()
      onSuccess?.()
    }
  }, [kickSuccess, onSuccess, refetch])

  // Reset handler when victim changes
  useEffect(() => {
    hasHandledSuccess.current = false
    setShowSuccess(false)
    setSuccessTokenId(null)
  }, [victim])

  if (!isConnected) {
    return (
      <p style={{ color: '#888', textAlign: 'center' }}>
        Connect wallet to stick or kick
      </p>
    )
  }

  const stickLoading = stickPending || stickConfirming
  const kickLoading = kickPending || kickConfirming

  // Show success state with OpenSea link
  const latestTokenId = tokenIds && tokenIds.length > 0 ? tokenIds[tokenIds.length - 1] : undefined
  const displayTokenId = successTokenId || latestTokenId
  if (showSuccess || stickConfirming) {
    const openseaUrl = displayTokenId
      ? `https://opensea.io/assets/ethereum/${KICKME_ADDRESS}/${displayTokenId}`
      : null
    const etherscanUrl = stickHash ? `https://etherscan.io/tx/${stickHash}` : null

    if (stickConfirming) {
      return (
        <div style={{ textAlign: 'center' }}>
          <p style={{ color: '#ffeb3b', fontSize: '20px' }}>
            ⏳ Confirming transaction...
          </p>
          {etherscanUrl && (
            <a
              href={etherscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: '#888', fontSize: '14px' }}
            >
              View on Etherscan →
            </a>
          )}
        </div>
      )
    }

    return (
      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#4ade80', fontSize: '24px', marginBottom: '16px' }}>
          🎉 Sign stuck!
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          {openseaUrl && (
            <a
              href={openseaUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                fontWeight: 'bold',
                background: '#2081e2',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
              }}
            >
              View on OpenSea →
            </a>
          )}
          {etherscanUrl && (
            <a
              href={etherscanUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: '12px 24px',
                fontSize: '16px',
                background: '#2a2a4e',
                border: '1px solid #444',
                borderRadius: '12px',
                color: '#888',
                textDecoration: 'none',
              }}
            >
              View tx
            </a>
          )}
        </div>
        <button
          onClick={() => {
            setShowSuccess(false)
            hasHandledSuccess.current = false
          }}
          style={{
            marginTop: '16px',
            padding: '8px 16px',
            background: 'transparent',
            border: 'none',
            color: '#666',
            cursor: 'pointer',
          }}
        >
          Stick another
        </button>
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
      <button
        onClick={() => stick(victim, BigInt(signSeed))}
        disabled={stickLoading}
        style={{
          padding: '16px 32px',
          fontSize: '18px',
          fontWeight: 'bold',
          background: stickLoading ? '#666' : '#ffeb3b',
          border: 'none',
          borderRadius: '12px',
          color: '#000',
          cursor: stickLoading ? 'not-allowed' : 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>🖐️</span>
          {stickLoading ? 'Sticking...' : 'Stick'}
        </span>
        <span style={{ fontSize: '12px', opacity: 0.7 }}>
          {formatEther(STICK_PRICE)} ETH
        </span>
      </button>

      {hasSign && (
        <button
          onClick={() => kick(victim)}
          disabled={kickLoading}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: kickLoading ? '#666' : '#d32f2f',
            border: 'none',
            borderRadius: '12px',
            color: '#fff',
            cursor: kickLoading ? 'not-allowed' : 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>🦵</span>
            {kickLoading ? 'Kicking...' : 'Kick'}
          </span>
          <span style={{ fontSize: '12px', opacity: 0.7 }}>
            {formatEther(KICK_PRICE)} ETH
          </span>
        </button>
      )}
    </div>
  )
}
