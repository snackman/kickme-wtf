import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list } from '@vercel/blob'

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

const EMPTY_BLOB: EventsBlob = {
  events: [],
  leaderboard: {
    mostStuck: [],
    mostKicked: [],
    topStickers: [],
    topKickers: [],
  },
  lastBlock: 0,
  updatedAt: 0,
  eventCount: 0,
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    let blobData: EventsBlob

    try {
      const { blobs } = await list({ prefix: 'events.json', limit: 1 })
      if (blobs.length === 0) {
        blobData = EMPTY_BLOB
      } else {
        const response = await fetch(blobs[0].url)
        if (!response.ok) {
          blobData = EMPTY_BLOB
        } else {
          blobData = await response.json() as EventsBlob
        }
      }
    } catch {
      blobData = EMPTY_BLOB
    }

    // Optional victim filter
    const victim = req.query.victim as string | undefined
    if (victim) {
      const victimLower = victim.toLowerCase()
      blobData = {
        ...blobData,
        events: blobData.events.filter(
          e => e.victim.toLowerCase() === victimLower
        ),
      }
    }

    // CDN cache headers
    res.setHeader('Cache-Control', 'public, s-maxage=30, stale-while-revalidate=60')

    return res.status(200).json(blobData)
  } catch (err) {
    console.error('Error fetching events:', err)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
