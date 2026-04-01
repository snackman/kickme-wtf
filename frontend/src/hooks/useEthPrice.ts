import { useState, useEffect, useCallback } from 'react'

const COINGECKO_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd'
const CACHE_KEY = 'kickme_eth_price'
const CACHE_TTL = 60_000      // 60s — don't re-fetch within this window
const STALE_TTL = 5 * 60_000  // 5 min — show stale indicator
const MAX_AGE = 30 * 60_000   // 30 min — fall back to on-chain minimums

type PriceCache = { price: number; updatedAt: number }

function loadCache(): PriceCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    return JSON.parse(raw)
  } catch {
    return null
  }
}

function saveCache(price: number) {
  localStorage.setItem(CACHE_KEY, JSON.stringify({ price, updatedAt: Date.now() }))
}

type EthPriceResult = {
  price: number | null
  isLoading: boolean
  error: string | null
  isStale: boolean
  refetch: () => void
}

export function useEthPrice(): EthPriceResult {
  const [price, setPrice] = useState<number | null>(() => {
    const cached = loadCache()
    return cached && (Date.now() - cached.updatedAt) < MAX_AGE ? cached.price : null
  })
  const [isLoading, setIsLoading] = useState(price === null)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdated, setLastUpdated] = useState<number | null>(() => {
    const cached = loadCache()
    return cached && (Date.now() - cached.updatedAt) < MAX_AGE ? cached.updatedAt : null
  })

  const fetchPrice = useCallback(async () => {
    // Skip if cache is fresh
    const cached = loadCache()
    if (cached && (Date.now() - cached.updatedAt) < CACHE_TTL) {
      setPrice(cached.price)
      setLastUpdated(cached.updatedAt)
      setIsLoading(false)
      return
    }

    try {
      const res = await fetch(COINGECKO_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const p = data?.ethereum?.usd
      if (typeof p !== 'number' || p <= 0) throw new Error('Invalid price data')

      saveCache(p)
      setPrice(p)
      setLastUpdated(Date.now())
      setError(null)
    } catch (err) {
      setError((err as Error).message)
      // Keep cached price if still within max age
      if (cached && (Date.now() - cached.updatedAt) < MAX_AGE) {
        setPrice(cached.price)
        setLastUpdated(cached.updatedAt)
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchPrice()
    const interval = setInterval(fetchPrice, CACHE_TTL)
    return () => clearInterval(interval)
  }, [fetchPrice])

  const isStale = lastUpdated ? (Date.now() - lastUpdated) > STALE_TTL : false

  return { price, isLoading, error, isStale, refetch: fetchPrice }
}
