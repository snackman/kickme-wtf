import { useEffect, useState } from 'react'
import { isAddressEqual, type Address } from 'viem'
import { KICKME_ADDRESS } from '../lib/contract'

export type HistoryEvent = {
  type: 'stuck' | 'kicked'
  victim: Address
  actor: Address
  timestamp: number
  blockNumber: bigint
  transactionHash: string
  totalKicks?: bigint
  tokenId?: bigint
}

// API response types (plain numbers, not bigints)
type ApiEvent = {
  type: 'stuck' | 'kicked'
  victim: string
  actor: string
  timestamp: number
  blockNumber: number
  transactionHash: string
  totalKicks?: number
  tokenId?: number
}

type ApiResponse = {
  events: ApiEvent[]
  leaderboard: {
    mostStuck: [string, number][]
    mostKicked: [string, number][]
    topStickers: [string, number][]
    topKickers: [string, number][]
  }
  lastBlock: number
  updatedAt: number
  eventCount: number
}

// Serializable version for localStorage (bigints -> strings)
type CachedEvent = Omit<HistoryEvent, 'blockNumber' | 'totalKicks' | 'tokenId'> & {
  blockNumber: string
  totalKicks?: string
  tokenId?: string
}

type EventCache = {
  events: CachedEvent[]
  lastBlock: string
  updatedAt: number
}

const CACHE_KEY = `kickme_events_${KICKME_ADDRESS}`
const CACHE_TTL = 30 * 1000 // 30 seconds — matches API CDN cache

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
      totalKicks: e.totalKicks?.toString(),
      tokenId: e.tokenId?.toString(),
    })),
    lastBlock: lastBlock.toString(),
    updatedAt: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
}

function hydrateEvents(cached: CachedEvent[]): HistoryEvent[] {
  return cached.map(e => ({
    ...e,
    victim: e.victim as Address,
    actor: e.actor as Address,
    blockNumber: BigInt(e.blockNumber),
    totalKicks: e.totalKicks ? BigInt(e.totalKicks) : undefined,
    tokenId: e.tokenId ? BigInt(e.tokenId) : undefined,
  }))
}

function apiEventToHistoryEvent(e: ApiEvent): HistoryEvent {
  return {
    type: e.type,
    victim: e.victim as Address,
    actor: e.actor as Address,
    timestamp: e.timestamp,
    blockNumber: BigInt(e.blockNumber),
    transactionHash: e.transactionHash,
    totalKicks: e.totalKicks != null ? BigInt(e.totalKicks) : undefined,
    tokenId: e.tokenId != null ? BigInt(e.tokenId) : undefined,
  }
}

// Fetch events from the API (replaces RPC-based fetching)
async function fetchAllEvents(forceRefresh = false): Promise<{ events: HistoryEvent[], lastBlock: bigint }> {
  const cache = loadCache()

  // Use cache if fresh enough (unless force refresh)
  if (!forceRefresh && cache && (Date.now() - cache.updatedAt) < CACHE_TTL) {
    console.log('Using cached events:', cache.events.length)
    return { events: hydrateEvents(cache.events), lastBlock: BigInt(cache.lastBlock) }
  }

  try {
    const response = await fetch('/api/events')
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`)
    }

    const data: ApiResponse = await response.json()
    const events = data.events.map(apiEventToHistoryEvent)
    const lastBlock = BigInt(data.lastBlock)

    // Save to localStorage cache
    saveCache(events, lastBlock)
    console.log('Fetched', events.length, 'events from API')

    return { events, lastBlock }
  } catch (err) {
    console.error('Error fetching from API:', err)

    // Fall back to cache on error
    if (cache) {
      console.log('Falling back to cached events:', cache.events.length)
      return { events: hydrateEvents(cache.events), lastBlock: BigInt(cache.lastBlock) }
    }

    return { events: [], lastBlock: 0n }
  }
}

export function useHistory(victim: Address | undefined) {
  const [events, setEvents] = useState<HistoryEvent[]>(() => {
    // Initialize from cache immediately
    const cache = loadCache()
    if (cache && victim) {
      const cached = hydrateEvents(cache.events)
      return cached.filter(e => isAddressEqual(e.victim, victim))
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    if (!victim) return

    const fetchHistory = async () => {
      // Only show loading if we have no cached data
      const cache = loadCache()
      if (!cache) setIsLoading(true)

      try {
        const { events: allEvents } = await fetchAllEvents(refreshCount > 0)
        // Filter for this victim
        const victimEvents = allEvents.filter(e => isAddressEqual(e.victim, victim))
        setEvents(victimEvents)
      } catch (err) {
        console.error('Error fetching history:', err)
        // Keep cached data on error
      }
      setIsLoading(false)
    }

    fetchHistory()
  }, [victim, refreshCount])

  const refetch = () => setRefreshCount(c => c + 1)

  return { events, isLoading, refetch }
}

export function useRecentActivity() {
  const [events, setEvents] = useState<HistoryEvent[]>(() => {
    // Initialize from cache immediately
    const cache = loadCache()
    if (cache) {
      return hydrateEvents(cache.events).slice(0, 20)
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)
  const [refreshCount, setRefreshCount] = useState(0)

  useEffect(() => {
    const fetchRecent = async () => {
      // Only show loading if we have no cached data
      const cache = loadCache()
      if (!cache) setIsLoading(true)

      try {
        const { events: allEvents } = await fetchAllEvents(refreshCount > 0)
        setEvents(allEvents.slice(0, 20))
      } catch (err) {
        console.error('Error fetching recent activity:', err)
        // Keep cached data on error
      }
      setIsLoading(false)
    }

    fetchRecent()
  }, [refreshCount])

  const refetch = () => setRefreshCount(c => c + 1)

  return { events, isLoading, refetch }
}

export function useAllEvents() {
  const [events, setEvents] = useState<HistoryEvent[]>(() => {
    const cache = loadCache()
    if (cache) {
      return hydrateEvents(cache.events)
    }
    return []
  })
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    const doFetch = async () => {
      const cache = loadCache()
      if (!cache) setIsLoading(true)

      try {
        const { events: allEvents } = await fetchAllEvents()
        setEvents(allEvents)
      } catch (err) {
        console.error('Error fetching events:', err)
      }
      setIsLoading(false)
    }

    doFetch()
  }, [])

  return { events, isLoading }
}
