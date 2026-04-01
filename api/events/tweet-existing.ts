import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, get } from '@vercel/blob'
import { TwitterApi } from 'twitter-api-v2'
import { createPublicClient, http, type Address } from 'viem'
import { mainnet } from 'viem/chains'

const SITE_URL = 'https://kickme.wtf'

function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.X_API_KEY?.trim()
  const appSecret = process.env.X_API_SECRET?.trim()
  const accessToken = process.env.X_ACCESS_TOKEN?.trim()
  const accessSecret = process.env.X_ACCESS_SECRET?.trim()
  if (!appKey || !appSecret || !accessToken || !accessSecret) return null
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
}

async function resolveDisplay(address: Address): Promise<string> {
  try {
    const alchemyKey = process.env.VITE_ALCHEMY_KEY || process.env.ALCHEMY_KEY
    const rpc = alchemyKey
      ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
      : 'https://ethereum-rpc.publicnode.com'
    const client = createPublicClient({ chain: mainnet, transport: http(rpc) })
    const name = await client.getEnsName({ address })
    if (name) return name
  } catch { /* fall through */ }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const backfillSecret = process.env.BACKFILL_SECRET
  const authHeader = req.headers.authorization
  if (!backfillSecret || !authHeader || authHeader !== `Bearer ${backfillSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
  }

  // Check Twitter credentials first
  const twitter = getTwitterClient()
  if (!twitter) {
    const missing = []
    if (!process.env.X_API_KEY?.trim()) missing.push('X_API_KEY')
    if (!process.env.X_API_SECRET?.trim()) missing.push('X_API_SECRET')
    if (!process.env.X_ACCESS_TOKEN?.trim()) missing.push('X_ACCESS_TOKEN')
    if (!process.env.X_ACCESS_SECRET?.trim()) missing.push('X_ACCESS_SECRET')
    return res.status(500).json({ error: 'Twitter credentials not configured', missing })
  }

  try {
    const { blobs } = await list({ prefix: 'events.json', limit: 1 })
    if (blobs.length === 0) {
      return res.status(404).json({ error: 'No events found' })
    }

    const response = await get(blobs[0].url, { access: 'private' })
    if (!response || response.statusCode !== 200) {
      return res.status(500).json({ error: 'Failed to read blob' })
    }

    const text = await new Response(response.stream).text()
    const data = JSON.parse(text)

    // Tweet events oldest first
    const events = [...data.events].reverse()
    const results: Array<{ event: string; status: string; error?: string; tweetId?: string }> = []

    for (const event of events) {
      try {
        const [victimName, actorName] = await Promise.all([
          resolveDisplay(event.victim as Address),
          resolveDisplay(event.actor as Address),
        ])

        let tweetText: string
        if (event.type === 'stuck') {
          tweetText = `🖐️ ${actorName} just stuck a Kick Me sign on ${victimName}! 🎯\n\n${SITE_URL}/${event.victim}`
        } else {
          const kickText = event.totalKicks === 1 ? '1 kick' : `${event.totalKicks ?? 0} kicks`
          tweetText = `🦵 ${actorName} just kicked ${victimName}! That's ${kickText} total! 💥\n\n${SITE_URL}/${event.victim}`
        }

        const tweet = await twitter.v2.tweet(tweetText)
        results.push({
          event: `${event.type}: ${event.actor} -> ${event.victim}`,
          status: 'tweeted',
          tweetId: tweet.data.id,
        })
      } catch (err: any) {
        results.push({
          event: `${event.type}: ${event.actor} -> ${event.victim}`,
          status: 'failed',
          error: err?.data ? JSON.stringify(err.data) : String(err),
        })
      }
    }

    return res.status(200).json({ results })
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
