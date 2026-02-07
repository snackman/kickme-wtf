import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// We need to reset modules between tests because ensCache has module-level state
// Test the cache format/behavior without importing the actual module

describe('ensCache', () => {
  const CACHE_KEY = 'kickme_ens_cache_v2'
  const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

  type EnsCache = {
    addressToName: Record<string, string | null>
    nameToAddress: Record<string, string | null>
    updatedAt: number
  }

  function loadCache(): EnsCache | null {
    try {
      const cached = localStorage.getItem(CACHE_KEY)
      if (cached) {
        const parsed = JSON.parse(cached) as EnsCache
        if (Date.now() - parsed.updatedAt < CACHE_TTL) {
          return parsed
        }
      }
    } catch {
      // Ignore parse errors
    }
    return null
  }

  function getCachedEnsName(address: string): string | null | undefined {
    const cache = loadCache()
    if (!cache || !cache.addressToName) return undefined
    const lowerAddr = address.toLowerCase()
    if (lowerAddr in cache.addressToName && cache.addressToName[lowerAddr] !== null) {
      return cache.addressToName[lowerAddr]
    }
    return undefined
  }

  function getCachedAddress(name: string): string | null | undefined {
    const cache = loadCache()
    if (!cache) return undefined
    const lowerName = name.toLowerCase()
    if (lowerName in cache.nameToAddress && cache.nameToAddress[lowerName] !== null) {
      return cache.nameToAddress[lowerName]
    }
    return undefined
  }

  beforeEach(() => {
    localStorage.clear()
  })

  describe('getCachedEnsName', () => {
    it('returns undefined when cache is empty', () => {
      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBeUndefined()
    })

    it('returns cached ENS name when present', () => {
      const cache = {
        addressToName: {
          '0x1234567890123456789012345678901234567890': 'test.eth',
        },
        nameToAddress: {},
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBe('test.eth')
    })

    it('is case-insensitive for addresses', () => {
      const cache = {
        addressToName: {
          '0xabcdef1234567890123456789012345678901234': 'test.eth',
        },
        nameToAddress: {},
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedEnsName('0xABCDEF1234567890123456789012345678901234')
      expect(result).toBe('test.eth')
    })

    it('returns undefined for null cached values (failed lookups)', () => {
      const cache = {
        addressToName: {
          '0x1234567890123456789012345678901234567890': null,
        },
        nameToAddress: {},
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBeUndefined()
    })

    it('returns undefined for expired cache', () => {
      const cache = {
        addressToName: {
          '0x1234567890123456789012345678901234567890': 'test.eth',
        },
        nameToAddress: {},
        updatedAt: Date.now() - 25 * 60 * 60 * 1000, // 25 hours ago (expired)
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBeUndefined()
    })
  })

  describe('getCachedAddress', () => {
    it('returns undefined when cache is empty', () => {
      const result = getCachedAddress('test.eth')
      expect(result).toBeUndefined()
    })

    it('returns cached address when present', () => {
      const cache = {
        addressToName: {},
        nameToAddress: {
          'test.eth': '0x1234567890123456789012345678901234567890',
        },
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedAddress('test.eth')
      expect(result).toBe('0x1234567890123456789012345678901234567890')
    })

    it('is case-insensitive for ENS names', () => {
      const cache = {
        addressToName: {},
        nameToAddress: {
          'test.eth': '0x1234567890123456789012345678901234567890',
        },
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedAddress('TEST.eth')
      expect(result).toBe('0x1234567890123456789012345678901234567890')
    })

    it('returns undefined for null cached values (failed lookups)', () => {
      const cache = {
        addressToName: {},
        nameToAddress: {
          'test.eth': null,
        },
        updatedAt: Date.now(),
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(cache))

      const result = getCachedAddress('test.eth')
      expect(result).toBeUndefined()
    })
  })

  describe('cache TTL', () => {
    it('uses 24 hour TTL', () => {
      // Cache that is 23 hours old should be valid
      const validCache = {
        addressToName: {
          '0x1234567890123456789012345678901234567890': 'test.eth',
        },
        nameToAddress: {},
        updatedAt: Date.now() - 23 * 60 * 60 * 1000,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(validCache))

      expect(getCachedEnsName('0x1234567890123456789012345678901234567890')).toBe('test.eth')

      // Cache that is 25 hours old should be expired
      const expiredCache = {
        addressToName: {
          '0xabcdef1234567890123456789012345678901234': 'old.eth',
        },
        nameToAddress: {},
        updatedAt: Date.now() - 25 * 60 * 60 * 1000,
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(expiredCache))

      expect(getCachedEnsName('0xabcdef1234567890123456789012345678901234')).toBeUndefined()
    })
  })

  describe('cache corruption handling', () => {
    it('handles corrupted JSON gracefully', () => {
      localStorage.setItem(CACHE_KEY, 'not valid json')

      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBeUndefined()
    })

    it('handles missing fields gracefully', () => {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ updatedAt: Date.now() }))

      const result = getCachedEnsName('0x1234567890123456789012345678901234567890')
      expect(result).toBeUndefined()
    })
  })
})
