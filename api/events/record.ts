import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, put } from '@vercel/blob'
import { createPublicClient, http, parseEventLogs, getAddress } from 'viem'
import { mainnet } from 'viem/chains'

const CONTRACT_ADDRESS = '0x6fCdfA445bF2752D4F38AB67F08c7eEDEfEaAed8' as const

const KICKME_ABI = [
  {
    type: 'event' as const,
    name: 'Stuck' as const,
    inputs: [
      { name: 'victim', type: 'address' as const, indexed: true },
      { name: 'sticker', type: 'address' as const, indexed: true },
      { name: 'tokenId', type: 'uint256' as const, indexed: false },
    ],
  },
  {
    type: 'event' as const,
    name: 'Kicked' as const,
    inputs: [
      { name: 'victim', type: 'address' as const, indexed: true },
      { name: 'kicker', type: 'address' as const, indexed: true },
      { name: 'totalKicks', type: 'uint256' as const, indexed: false },
    ],
  },
] as const

type StoredEvent = {
  type: 'stuck' | 'kicked'
  victim: string
  actor: string
  timestamp: number
  blockNumber: number
  transactionHash: string
  totalKicks?: number
  tokenId?: number
}

type EventsBlob = {
  events: StoredEvent[]
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

function computeLeaderboard(events: StoredEvent[]) {
  const stuckCounts = new Map<string, number>()
  const kickedCounts = new Map<string, number>()
  const stickerCounts = new Map<string, number>()
  const kickerCounts = new Map<string, number>()

  for (const e of events) {
    if (e.type === 'stuck') {
      stuckCounts.set(e.victim, (stuckCounts.get(e.victim) || 0) + 1)
      stickerCounts.set(e.actor, (stickerCounts.get(e.actor) || 0) + 1)
    } else {
      kickedCounts.set(e.victim, (kickedCounts.get(e.victim) || 0) + 1)
      kickerCounts.set(e.actor, (kickerCounts.get(e.actor) || 0) + 1)
    }
  }

  const top = (map: Map<string, number>, n = 10): [string, number][] =>
    [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, n)

  return {
    mostStuck: top(stuckCounts),
    mostKicked: top(kickedCounts),
    topStickers: top(stickerCounts),
    topKickers: top(kickerCounts),
  }
}

function getRpcUrl(): string {
  const alchemyKey = process.env.VITE_ALCHEMY_KEY || process.env.ALCHEMY_KEY
  if (alchemyKey) {
    return `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
  }
  return 'https://ethereum-rpc.publicnode.com'
}

async function readCurrentBlob(): Promise<EventsBlob> {
  try {
    const { blobs } = await list({ prefix: 'events.json', limit: 1 })
    if (blobs.length === 0) {
      return {
        events: [],
        leaderboard: { mostStuck: [], mostKicked: [], topStickers: [], topKickers: [] },
        lastBlock: 0,
        updatedAt: 0,
        eventCount: 0,
      }
    }
    const response = await fetch(blobs[0].url)
    if (!response.ok) throw new Error(`Blob fetch failed: ${response.status}`)
    return await response.json() as EventsBlob
  } catch {
    return {
      events: [],
      leaderboard: { mostStuck: [], mostKicked: [], topStickers: [], topKickers: [] },
      lastBlock: 0,
      updatedAt: 0,
      eventCount: 0,
    }
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { transactionHash } = req.body as { transactionHash?: string }
  if (!transactionHash) {
    return res.status(400).json({ error: 'transactionHash is required' })
  }

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(getRpcUrl()),
    })

    // Fetch the transaction receipt
    const receipt = await client.getTransactionReceipt({
      hash: transactionHash as `0x${string}`,
    })

    // Verify the transaction is to our contract
    if (!receipt.to || getAddress(receipt.to) !== getAddress(CONTRACT_ADDRESS)) {
      return res.status(400).json({ error: 'Transaction is not to the KickMe contract' })
    }

    // Parse event logs
    const parsedLogs = parseEventLogs({
      abi: KICKME_ABI,
      logs: receipt.logs,
    })

    if (parsedLogs.length === 0) {
      return res.status(400).json({ error: 'No Stuck or Kicked events found in transaction' })
    }

    // Get block timestamp
    const block = await client.getBlock({ blockNumber: receipt.blockNumber })

    // Build new events from parsed logs
    const newEvents: StoredEvent[] = []
    for (const log of parsedLogs) {
      if (log.eventName === 'Stuck') {
        newEvents.push({
          type: 'stuck',
          victim: log.args.victim,
          actor: log.args.sticker,
          timestamp: Number(block.timestamp),
          blockNumber: Number(receipt.blockNumber),
          transactionHash: receipt.transactionHash,
          tokenId: Number(log.args.tokenId),
        })
      } else if (log.eventName === 'Kicked') {
        newEvents.push({
          type: 'kicked',
          victim: log.args.victim,
          actor: log.args.kicker,
          timestamp: Number(block.timestamp),
          blockNumber: Number(receipt.blockNumber),
          transactionHash: receipt.transactionHash,
          totalKicks: Number(log.args.totalKicks),
        })
      }
    }

    // Read current blob and merge
    const current = await readCurrentBlob()

    // Deduplicate: skip events we already have
    const existingKeys = new Set(
      current.events.map(e => `${e.transactionHash}-${e.type}`)
    )
    const uniqueNewEvents = newEvents.filter(
      e => !existingKeys.has(`${e.transactionHash}-${e.type}`)
    )

    if (uniqueNewEvents.length === 0) {
      return res.status(200).json({ message: 'Events already recorded', eventCount: current.eventCount })
    }

    // Merge and sort by timestamp descending
    const allEvents = [...current.events, ...uniqueNewEvents]
    allEvents.sort((a, b) => b.timestamp - a.timestamp)

    // Recompute leaderboard
    const leaderboard = computeLeaderboard(allEvents)

    const updatedBlob: EventsBlob = {
      events: allEvents,
      leaderboard,
      lastBlock: Math.max(current.lastBlock, Number(receipt.blockNumber)),
      updatedAt: Date.now(),
      eventCount: allEvents.length,
    }

    // Write back to blob
    await put('events.json', JSON.stringify(updatedBlob), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    })

    return res.status(200).json({
      message: 'Events recorded',
      newEvents: uniqueNewEvents.length,
      eventCount: updatedBlob.eventCount,
    })
  } catch (err) {
    console.error('Error recording event:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
