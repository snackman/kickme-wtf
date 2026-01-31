import { createPublicClient, http, type Address } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const CACHE_KEY = 'kickme_ens_cache_v2' // v2: don't cache failures
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24 hours

type EnsCache = {
  // address -> ens name (or null if no name)
  addressToName: Record<string, string | null>
  // ens name -> address (or null if not found)
  nameToAddress: Record<string, string | null>
  updatedAt: number
}

let memoryCache: EnsCache | null = null

function loadCache(): EnsCache {
  if (memoryCache) return memoryCache

  try {
    const cached = localStorage.getItem(CACHE_KEY)
    if (cached) {
      const parsed = JSON.parse(cached) as EnsCache
      // Check if cache is still valid
      if (Date.now() - parsed.updatedAt < CACHE_TTL) {
        memoryCache = parsed
        return parsed
      }
    }
  } catch {
    // Ignore parse errors
  }

  memoryCache = { addressToName: {}, nameToAddress: {}, updatedAt: Date.now() }
  return memoryCache
}

function saveCache() {
  if (!memoryCache) return
  memoryCache.updatedAt = Date.now()
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(memoryCache))
  } catch {
    // Ignore quota errors
  }
}

const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth.drpc.org'),
})

// Reverse lookup: address -> ENS name
export async function getEnsName(address: Address): Promise<string | null> {
  const cache = loadCache()
  const lowerAddr = address.toLowerCase()

  // Only use cache for successful lookups
  if (lowerAddr in cache.addressToName && cache.addressToName[lowerAddr] !== null) {
    return cache.addressToName[lowerAddr]
  }

  try {
    const name = await publicClient.getEnsName({ address })
    if (name) {
      cache.addressToName[lowerAddr] = name
      saveCache()
    }
    // Don't cache null - might be RPC failure
    return name
  } catch {
    return null
  }
}

// Forward lookup: ENS name -> address
export async function resolveEnsName(name: string): Promise<string | null> {
  const cache = loadCache()
  const lowerName = name.toLowerCase()

  // Only use cache for successful lookups (not null)
  if (lowerName in cache.nameToAddress && cache.nameToAddress[lowerName] !== null) {
    return cache.nameToAddress[lowerName]
  }

  try {
    const normalizedName = normalize(name)
    const address = await publicClient.getEnsAddress({ name: normalizedName })
    if (address) {
      cache.nameToAddress[lowerName] = address
      // Also cache the reverse lookup
      cache.addressToName[address.toLowerCase()] = name
      saveCache()
    }
    // Don't cache null results - they might be RPC failures
    return address
  } catch {
    // Don't cache errors
    return null
  }
}

// Check if we have a cached value (sync, for initial render)
export function getCachedEnsName(address: Address): string | null | undefined {
  const cache = loadCache()
  const lowerAddr = address.toLowerCase()
  // Only return cached value if it's a successful lookup
  if (lowerAddr in cache.addressToName && cache.addressToName[lowerAddr] !== null) {
    return cache.addressToName[lowerAddr]
  }
  return undefined // undefined means not cached or was a failed lookup
}

export function getCachedAddress(name: string): string | null | undefined {
  const cache = loadCache()
  const lowerName = name.toLowerCase()
  // Only return cached value if it's a successful lookup (not null)
  if (lowerName in cache.nameToAddress && cache.nameToAddress[lowerName] !== null) {
    return cache.nameToAddress[lowerName]
  }
  return undefined // undefined means not cached or was a failed lookup
}
