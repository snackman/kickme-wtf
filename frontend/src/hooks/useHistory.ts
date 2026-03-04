import { useEffect, useState } from 'react'
import { createPublicClient, http, isAddressEqual, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import { KICKME_ADDRESS, KICKME_ABI, KICKME_DEPLOY_BLOCK } from '../lib/contract'

export type HistoryEvent = {
  type: 'stuck' | 'kicked'
  victim: Address
  actor: Address
  timestamp: number
  blockNumber: bigint
  transactionHash: string
  totalKicks?: bigint
}

// Serializable version for localStorage (bigints → strings)
type CachedEvent = Omit<HistoryEvent, 'blockNumber' | 'totalKicks'> & { blockNumber: string; totalKicks?: string }

type EventCache = {
  events: CachedEvent[]
  lastBlock: string
  updatedAt: number
}

const CACHE_KEY = 'kickme_events_cache_v2'
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes - refetch if older

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
    })),
    lastBlock: lastBlock.toString(),
    updatedAt: Date.now(),
  }
  localStorage.setItem(CACHE_KEY, JSON.stringify(cached))
}

function hydrateEvents(cached: CachedEvent[]): HistoryEvent[] {
  return cached.map(e => ({
    ...e,
    blockNumber: BigInt(e.blockNumber),
    totalKicks: e.totalKicks ? BigInt(e.totalKicks) : undefined,
  }))
}

const client = createPublicClient({
  chain: baseSepolia,
  transport: http('https://base-sepolia-rpc.publicnode.com'),
})

// Event ABIs
const stuckEvent = KICKME_ABI.find(x => x.type === 'event' && x.name === 'Stuck')!
const kickedEvent = KICKME_ABI.find(x => x.type === 'event' && x.name === 'Kicked')!

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

  useEffect(() => {
    if (!victim) return

    const fetchHistory = async () => {
      // Only show loading if we have no cached data
      const cache = loadCache()
      if (!cache) setIsLoading(true)

      try {
        const { events: allEvents } = await fetchAllEvents()
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
  }, [victim])

  return { events, isLoading }
}

// Max block range for public RPCs (publicnode allows 50k with explicit toBlock)
const CHUNK_SIZE = 50000n
const BATCH_CONCURRENCY = 3

// Fetch logs in chunks to avoid RPC block range limits
async function getLogsChunked(
  event: any,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<any[]> {
  const chunks: { from: bigint; to: bigint }[] = []
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n
    chunks.push({ from: start, to: end })
  }

  const allLogs: any[] = []

  // Process chunks in batches to avoid overwhelming the RPC
  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const batch = chunks.slice(i, i + BATCH_CONCURRENCY)
    const results = await Promise.all(
      batch.map(({ from, to }) =>
        client.getLogs({
          address: KICKME_ADDRESS,
          event,
          fromBlock: from,
          toBlock: to,
        })
      )
    )
    for (const logs of results) {
      allLogs.push(...logs)
    }
  }

  return allLogs
}

// Shared event fetching with caching
async function fetchAllEvents(): Promise<{ events: HistoryEvent[], lastBlock: bigint }> {
  const cache = loadCache()
  const currentBlock = await client.getBlockNumber()

  // Use cache if fresh enough
  if (cache && (Date.now() - cache.updatedAt) < CACHE_TTL) {
    console.log('Using cached events:', cache.events.length)
    return { events: hydrateEvents(cache.events), lastBlock: BigInt(cache.lastBlock) }
  }

  // Fetch from last cached block or from deploy block
  const fromBlock = cache ? BigInt(cache.lastBlock) + 1n : KICKME_DEPLOY_BLOCK
  console.log('Fetching events from block:', fromBlock.toString(), 'to:', currentBlock.toString())

  const [stuckLogs, kickedLogs] = await Promise.all([
    getLogsChunked(stuckEvent, fromBlock, currentBlock),
    getLogsChunked(kickedEvent, fromBlock, currentBlock),
  ])

  const newEvents: HistoryEvent[] = []

  for (const log of stuckLogs as any[]) {
    newEvents.push({
      type: 'stuck',
      victim: log.args.victim,
      actor: log.args.sticker,
      timestamp: 0,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
    })
  }

  for (const log of kickedLogs as any[]) {
    newEvents.push({
      type: 'kicked',
      victim: log.args.victim,
      actor: log.args.kicker,
      timestamp: 0,
      blockNumber: log.blockNumber,
      transactionHash: log.transactionHash,
      totalKicks: log.args.totalKicks,
    })
  }

  // Fetch timestamps for new events
  if (newEvents.length > 0) {
    const blocks = await Promise.all(
      newEvents.map(e => client.getBlock({ blockNumber: e.blockNumber }))
    )
    newEvents.forEach((e, i) => {
      e.timestamp = Number(blocks[i].timestamp)
    })
  }

  // Merge with cached events
  const cachedEvents = cache ? hydrateEvents(cache.events) : []
  const allEvents = [...cachedEvents, ...newEvents]

  // Deduplicate by transaction hash
  const seen = new Set<string>()
  const uniqueEvents = allEvents.filter(e => {
    if (seen.has(e.transactionHash)) return false
    seen.add(e.transactionHash)
    return true
  })

  // Sort by timestamp descending
  uniqueEvents.sort((a, b) => b.timestamp - a.timestamp)

  // Save to cache
  saveCache(uniqueEvents, currentBlock)
  console.log('Cached', uniqueEvents.length, 'events up to block', currentBlock.toString())

  return { events: uniqueEvents, lastBlock: currentBlock }
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

  useEffect(() => {
    const fetchRecent = async () => {
      // Only show loading if we have no cached data
      const cache = loadCache()
      if (!cache) setIsLoading(true)

      try {
        const { events: allEvents } = await fetchAllEvents()
        setEvents(allEvents.slice(0, 20))
      } catch (err) {
        console.error('Error fetching recent activity:', err)
        // Keep cached data on error
      }
      setIsLoading(false)
    }

    fetchRecent()
  }, [])

  return { events, isLoading }
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
    const fetch = async () => {
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

    fetch()
  }, [])

  return { events, isLoading }
}
