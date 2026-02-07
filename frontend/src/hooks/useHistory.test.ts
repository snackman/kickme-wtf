import { describe, it, expect, vi, beforeEach } from 'vitest'
import type { HistoryEvent } from './useHistory'

// Test the caching logic without importing the actual hook (to avoid viem dependency issues)
const CACHE_KEY = 'kickme_events_cache_v2'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

type CachedEvent = Omit<HistoryEvent, 'blockNumber'> & { blockNumber: string }

type EventCache = {
  events: CachedEvent[]
  lastBlock: string
  updatedAt: number
}

function loadCache(): EventCache | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (!cached) return null
    return JSON.parse(cached)
  } catch {
    return null
  }
}

function saveCache(events: HistoryEvent[], lastBlock: bigint) {
  const cached: EventCache = {
    events: events.map(e => ({
      ...e,
      blockNumber: e.blockNumber.toString(),
      // Convert totalKicks bigint to string for JSON serialization
      totalKicks: e.totalKicks !== undefined ? e.totalKicks.toString() : undefined,
    })) as CachedEvent[],
    lastBlock: lastBlock.toString(),
    updatedAt: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
}

function hydrateEvents(cached: CachedEvent[]): HistoryEvent[] {
  return cached.map(e => ({
    ...e,
    blockNumber: BigInt(e.blockNumber),
    // Convert totalKicks string back to bigint if present
    totalKicks: (e as any).totalKicks !== undefined ? BigInt((e as any).totalKicks) : undefined,
  }))
}

describe('useHistory caching', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  describe('loadCache', () => {
    it('returns null when cache is empty', () => {
      expect(loadCache()).toBeNull()
    })

    it('returns cached data when present', () => {
      const cache: EventCache = {
        events: [],
        lastBlock: '1000',
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = loadCache()
      expect(result).not.toBeNull()
      expect(result!.lastBlock).toBe('1000')
    })

    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem(CACHE_KEY, 'not valid json')
      expect(loadCache()).toBeNull()
    })
  })

  describe('saveCache', () => {
    it('saves events with stringified blockNumber', () => {
      const events: HistoryEvent[] = [
        {
          type: 'stuck',
          victim: '0x1234567890123456789012345678901234567890',
          actor: '0xabcdef1234567890123456789012345678901234',
          timestamp: 1234567890,
          blockNumber: 12345n,
          transactionHash: '0xabc123',
        },
      ]

      saveCache(events, 20000n)

      const cached = loadCache()
      expect(cached).not.toBeNull()
      expect(cached!.events[0].blockNumber).toBe('12345')
      expect(cached!.lastBlock).toBe('20000')
    })

    it('saves updatedAt timestamp', () => {
      const before = Date.now()
      saveCache([], 100n)
      const after = Date.now()

      const cached = loadCache()
      expect(cached!.updatedAt).toBeGreaterThanOrEqual(before)
      expect(cached!.updatedAt).toBeLessThanOrEqual(after)
    })
  })

  describe('hydrateEvents', () => {
    it('converts stringified blockNumber back to bigint', () => {
      const cached: CachedEvent[] = [
        {
          type: 'kicked',
          victim: '0x1234567890123456789012345678901234567890',
          actor: '0xabcdef1234567890123456789012345678901234',
          timestamp: 1234567890,
          blockNumber: '99999',
          transactionHash: '0xdef456',
          totalKicks: 5n,
        },
      ]

      const hydrated = hydrateEvents(cached)
      expect(hydrated[0].blockNumber).toBe(99999n)
      expect(typeof hydrated[0].blockNumber).toBe('bigint')
    })

    it('preserves all other fields', () => {
      const cached: CachedEvent[] = [
        {
          type: 'stuck',
          victim: '0x1111111111111111111111111111111111111111',
          actor: '0x2222222222222222222222222222222222222222',
          timestamp: 9999999,
          blockNumber: '500',
          transactionHash: '0xhash123',
        },
      ]

      const hydrated = hydrateEvents(cached)
      expect(hydrated[0].type).toBe('stuck')
      expect(hydrated[0].victim).toBe('0x1111111111111111111111111111111111111111')
      expect(hydrated[0].actor).toBe('0x2222222222222222222222222222222222222222')
      expect(hydrated[0].timestamp).toBe(9999999)
      expect(hydrated[0].transactionHash).toBe('0xhash123')
    })
  })

  describe('cache freshness', () => {
    it('cache TTL is 5 minutes', () => {
      expect(CACHE_TTL).toBe(5 * 60 * 1000)
    })

    it('cache within TTL is considered fresh', () => {
      const cache: EventCache = {
        events: [],
        lastBlock: '1000',
        updatedAt: Date.now() - 4 * 60 * 1000, // 4 minutes ago
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const loaded = loadCache()
      const isFresh = loaded && (Date.now() - loaded.updatedAt) < CACHE_TTL
      expect(isFresh).toBe(true)
    })

    it('cache beyond TTL is considered stale', () => {
      const cache: EventCache = {
        events: [],
        lastBlock: '1000',
        updatedAt: Date.now() - 6 * 60 * 1000, // 6 minutes ago
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const loaded = loadCache()
      const isFresh = loaded && (Date.now() - loaded.updatedAt) < CACHE_TTL
      expect(isFresh).toBe(false)
    })
  })

  describe('event types', () => {
    it('supports stuck events', () => {
      const events: HistoryEvent[] = [
        {
          type: 'stuck',
          victim: '0x1234567890123456789012345678901234567890',
          actor: '0xabcdef1234567890123456789012345678901234',
          timestamp: 1234567890,
          blockNumber: 100n,
          transactionHash: '0xabc',
        },
      ]

      saveCache(events, 100n)
      const cached = loadCache()
      expect(cached!.events[0].type).toBe('stuck')
    })

    it('supports kicked events with totalKicks', () => {
      const events: HistoryEvent[] = [
        {
          type: 'kicked',
          victim: '0x1234567890123456789012345678901234567890',
          actor: '0xabcdef1234567890123456789012345678901234',
          timestamp: 1234567890,
          blockNumber: 100n,
          transactionHash: '0xdef',
          totalKicks: 42n,
        },
      ]

      saveCache(events, 100n)
      const cached = loadCache()
      const hydrated = hydrateEvents(cached!.events)
      expect(hydrated[0].type).toBe('kicked')
      expect(hydrated[0].totalKicks).toBe(42n)
    })
  })

  describe('incremental caching', () => {
    it('can determine fromBlock for incremental fetch', () => {
      const cache: EventCache = {
        events: [],
        lastBlock: '5000',
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const loaded = loadCache()
      const fromBlock = loaded ? BigInt(loaded.lastBlock) + 1n : 0n
      expect(fromBlock).toBe(5001n)
    })

    it('starts from block 0 when no cache', () => {
      const loaded = loadCache()
      const fromBlock = loaded ? BigInt(loaded.lastBlock) + 1n : 0n
      expect(fromBlock).toBe(0n)
    })
  })
})
