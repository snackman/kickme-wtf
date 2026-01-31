import { useEffect, useState } from 'react'
import type { Address } from 'viem'
import { getEnsName, getCachedEnsName } from '../lib/ensCache'

type Props = {
  address: Address
  color?: string
}

export function AddressDisplay({ address, color = '#ffeb3b' }: Props) {
  const cached = getCachedEnsName(address)
  const [ensName, setEnsName] = useState<string | null>(cached === undefined ? null : cached)

  useEffect(() => {
    // If already cached, use it
    const cached = getCachedEnsName(address)
    if (cached !== undefined) {
      setEnsName(cached)
      return
    }

    let cancelled = false

    const lookup = async () => {
      const name = await getEnsName(address)
      if (!cancelled) {
        setEnsName(name)
      }
    }

    lookup()
    return () => { cancelled = true }
  }, [address])

  const formatAddress = (addr: string) => `${addr.slice(0, 6)}...${addr.slice(-4)}`

  return (
    <span style={{ color, fontFamily: 'monospace' }}>
      {ensName || formatAddress(address)}
    </span>
  )
}
