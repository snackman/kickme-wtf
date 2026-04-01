import type { VercelRequest, VercelResponse } from '@vercel/node'
import { put } from '@vercel/blob'
import { createPublicClient, http, parseEventLogs } from 'viem'
import { mainnet } from 'viem/chains'

const CONTRACT_ADDRESS = '0x6fCdfA445bF2752D4F38AB67F08c7eEDEfEaAed8' as const
const DEPLOY_BLOCK = 24785768n
const CHUNK_SIZE = 50000n
const BATCH_CONCURRENCY = 3

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
  // Use publicnode for backfill — Alchemy free tier limits getLogs to 10-block ranges
  return 'https://ethereum-rpc.publicnode.com'
}

async function getLogsChunked(
  client: ReturnType<typeof createPublicClient>,
  fromBlock: bigint,
  toBlock: bigint,
): Promise<any[]> {
  const chunks: { from: bigint; to: bigint }[] = []
  for (let start = fromBlock; start <= toBlock; start += CHUNK_SIZE) {
    const end = start + CHUNK_SIZE - 1n > toBlock ? toBlock : start + CHUNK_SIZE - 1n
    chunks.push({ from: start, to: end })
  }

  const allLogs: any[] = []

  for (let i = 0; i < chunks.length; i += BATCH_CONCURRENCY) {
    const batch = chunks.slice(i, i + BATCH_CONCURRENCY)
    const results = await Promise.all(
      batch.map(({ from, to }) =>
        client.getLogs({
          address: CONTRACT_ADDRESS,
          events: KICKME_ABI,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  // Verify auth
  const backfillSecret = process.env.BACKFILL_SECRET
  if (!backfillSecret) {
    return res.status(500).json({ error: 'BACKFILL_SECRET not configured' })
  }

  const authHeader = req.headers.authorization
  if (!authHeader || authHeader !== `Bearer ${backfillSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  try {
    const client = createPublicClient({
      chain: mainnet,
      transport: http(getRpcUrl()),
    })

    const latestBlock = await client.getBlockNumber()
    const currentBlock = latestBlock - 10n // buffer for RPC indexing lag
    console.log(`Backfilling from block ${DEPLOY_BLOCK} to ${currentBlock}`)

    // Fetch all logs
    const allLogs = await getLogsChunked(client, DEPLOY_BLOCK, currentBlock)
    console.log(`Found ${allLogs.length} raw logs`)

    // Parse logs using viem
    const parsedLogs = parseEventLogs({
      abi: KICKME_ABI,
      logs: allLogs,
    })
    console.log(`Parsed ${parsedLogs.length} events`)

    // Collect unique block numbers for timestamp lookup
    const uniqueBlocks = [...new Set(parsedLogs.map(l => l.blockNumber))]
    console.log(`Fetching timestamps for ${uniqueBlocks.length} unique blocks`)

    // Fetch block timestamps in batches
    const blockTimestamps = new Map<bigint, number>()
    const TIMESTAMP_BATCH_SIZE = 10
    for (let i = 0; i < uniqueBlocks.length; i += TIMESTAMP_BATCH_SIZE) {
      const batch = uniqueBlocks.slice(i, i + TIMESTAMP_BATCH_SIZE)
      const blocks = await Promise.all(
        batch.map(blockNumber => client.getBlock({ blockNumber }))
      )
      for (const block of blocks) {
        blockTimestamps.set(block.number, Number(block.timestamp))
      }
    }

    // Build stored events
    const events: StoredEvent[] = []
    for (const log of parsedLogs) {
      const timestamp = blockTimestamps.get(log.blockNumber) || 0

      if (log.eventName === 'Stuck') {
        events.push({
          type: 'stuck',
          victim: log.args.victim,
          actor: log.args.sticker,
          timestamp,
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          tokenId: Number(log.args.tokenId),
        })
      } else if (log.eventName === 'Kicked') {
        events.push({
          type: 'kicked',
          victim: log.args.victim,
          actor: log.args.kicker,
          timestamp,
          blockNumber: Number(log.blockNumber),
          transactionHash: log.transactionHash,
          totalKicks: Number(log.args.totalKicks),
        })
      }
    }

    // Deduplicate by tx hash + type
    const seen = new Set<string>()
    const uniqueEvents = events.filter(e => {
      const key = `${e.transactionHash}-${e.type}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    // Sort by timestamp descending
    uniqueEvents.sort((a, b) => b.timestamp - a.timestamp)

    // Compute leaderboard
    const leaderboard = computeLeaderboard(uniqueEvents)

    const blob: EventsBlob = {
      events: uniqueEvents,
      leaderboard,
      lastBlock: Number(currentBlock),
      updatedAt: Date.now(),
      eventCount: uniqueEvents.length,
    }

    // Write to Vercel Blob
    await put('events.json', JSON.stringify(blob), {
      access: 'private',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
    })

    console.log(`Backfill complete: ${uniqueEvents.length} events, last block ${currentBlock}`)

    return res.status(200).json({
      message: 'Backfill complete',
      eventCount: uniqueEvents.length,
      lastBlock: Number(currentBlock),
      stuckEvents: uniqueEvents.filter(e => e.type === 'stuck').length,
      kickedEvents: uniqueEvents.filter(e => e.type === 'kicked').length,
    })
  } catch (err) {
    console.error('Backfill error:', err)
    return res.status(500).json({ error: 'Backfill failed', details: String(err) })
  }
}
