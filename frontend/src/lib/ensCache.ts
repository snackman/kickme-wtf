import { createPublicClient, http, type Address } from 'viem'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'

const CACHE_KEY = 'kickme_ens_cache'
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
  transport: http('https://cloudflare-eth.com'),
})

// Reverse lookup: address -> ENS name
export async function getEnsName(address: Address): Promise<string | null> {
  const cache = loadCache()
  const lowerAddr = address.toLowerCase()

  if (lowerAddr in cache.addressToName) {
    return cache.addressToName[lowerAddr]
  }

  try {
    const name = await publicClient.getEnsName({ address })
    cache.addressToName[lowerAddr] = name
    saveCache()
    return name
  } catch {
    cache.addressToName[lowerAddr] = null
    saveCache()
    return null
  }
}

// Forward lookup: ENS name -> address
export async function resolveEnsName(name: string): Promise<string | null> {
  const cache = loadCache()
  const lowerName = name.toLowerCase()

  if (lowerName in cache.nameToAddress) {
    return cache.nameToAddress[lowerName]
  }

  try {
    const normalizedName = normalize(name)
    const address = await publicClient.getEnsAddress({ name: normalizedName })
    cache.nameToAddress[lowerName] = address
    if (address) {
      // Also cache the reverse lookup
      cache.addressToName[address.toLowerCase()] = name
    }
    saveCache()
    return address
  } catch {
    cache.nameToAddress[lowerName] = null
    saveCache()
    return null
  }
}

// Check if we have a cached value (sync, for initial render)
export function getCachedEnsName(address: Address): string | null | undefined {
  const cache = loadCache()
  const lowerAddr = address.toLowerCase()
  if (lowerAddr in cache.addressToName) {
    return cache.addressToName[lowerAddr]
  }
  return undefined // undefined means not cached
}

export function getCachedAddress(name: string): string | null | undefined {
  const cache = loadCache()
  const lowerName = name.toLowerCase()
  if (lowerName in cache.nameToAddress) {
    return cache.nameToAddress[lowerName]
  }
  return undefined
}
