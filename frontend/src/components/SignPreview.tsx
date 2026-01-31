import { useState, useMemo, useEffect } from 'react'
import { generateSignSVG, randomSeed } from '../lib/signGenerator'

type Props = {
  size?: number
  seed?: number
  onSeedChange?: (seed: number) => void
}

export function SignPreview({ size = 200, seed: externalSeed, onSeedChange }: Props) {
  const [internalSeed, setInternalSeed] = useState(randomSeed)
  const seed = externalSeed ?? internalSeed

  const svg = useMemo(() => generateSignSVG(seed), [seed])

  // Notify parent of initial seed
  useEffect(() => {
    if (onSeedChange && externalSeed === undefined) {
      onSeedChange(internalSeed)
    }
  }, [])

  const regenerate = () => {
    const newSeed = randomSeed()
    setInternalSeed(newSeed)
    onSeedChange?.(newSeed)
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        style={{
          width: size,
          height: size,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
        }}
        dangerouslySetInnerHTML={{ __html: svg }}
      />
      <button
        onClick={regenerate}
        style={{
          background: 'rgba(255,255,255,0.1)',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: '8px',
          padding: '8px 16px',
          color: '#fff',
          cursor: 'pointer',
          fontSize: '14px',
          transition: 'all 0.2s',
        }}
      >
        Regenerate Sign
      </button>
    </div>
  )
}
