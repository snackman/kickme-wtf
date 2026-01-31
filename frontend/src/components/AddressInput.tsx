import { useState, useEffect } from 'react'
import { useEnsResolution } from '../hooks/useEnsResolution'
import type { Address } from 'viem'

type Props = {
  onAddressResolved: (address: Address | null) => void
  placeholder?: string
}

export function AddressInput({ onAddressResolved, placeholder = 'Enter wallet address or ENS' }: Props) {
  const [input, setInput] = useState('')
  const { address, isEns, isLoading, isValid, error } = useEnsResolution(input)

  useEffect(() => {
    if (isValid && address) {
      onAddressResolved(address as Address)
    } else {
      onAddressResolved(null)
    }
  }, [address, isValid, onAddressResolved])

  return (
    <div style={{ width: '100%', maxWidth: '500px' }}>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder={placeholder}
        style={{
          width: '100%',
          padding: '16px 20px',
          fontSize: '18px',
          fontFamily: 'monospace',
          border: error ? '2px solid #e74c3c' : isLoading ? '2px solid #ffeb3b' : '2px solid #444',
          borderRadius: '12px',
          background: '#2a2a4e',
          color: '#fff',
          outline: 'none',
        }}
      />
      {isLoading && (
        <p style={{ color: '#ffeb3b', marginTop: '8px', fontSize: '14px' }}>Resolving ENS...</p>
      )}
      {isValid && isEns && (
        <p style={{ color: '#4ade80', marginTop: '8px', fontSize: '14px' }}>Resolved: {input}</p>
      )}
      {error && (
        <p style={{ color: '#e74c3c', marginTop: '8px', fontSize: '14px' }}>{error}</p>
      )}
    </div>
  )
}
