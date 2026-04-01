import { TwitterApi } from 'twitter-api-v2'
import { createPublicClient, http, type Address } from 'viem'
import { mainnet } from 'viem/chains'

const SITE_URL = 'https://kickme.wtf'

function getEnsClient() {
  const alchemyKey = process.env.VITE_ALCHEMY_KEY || process.env.ALCHEMY_KEY
  const rpc = alchemyKey
    ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyKey}`
    : 'https://ethereum-rpc.publicnode.com'
  return createPublicClient({ chain: mainnet, transport: http(rpc) })
}

async function resolveDisplay(address: Address): Promise<string> {
  try {
    const client = getEnsClient()
    const name = await client.getEnsName({ address })
    if (name) return name
  } catch { /* fall through */ }
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.X_API_KEY?.trim()
  const appSecret = process.env.X_API_SECRET?.trim()
  const accessToken = process.env.X_ACCESS_TOKEN?.trim()
  const accessSecret = process.env.X_ACCESS_SECRET?.trim()
  if (!appKey || !appSecret || !accessToken || !accessSecret) return null
  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
}

export async function tweetEvents(events: Array<{
  type: 'stuck' | 'kicked'
  victim: string
  actor: string
  totalKicks?: number
}>) {
  const twitter = getTwitterClient()
  if (!twitter) {
    console.log('Twitter credentials not configured, skipping tweet')
    return
  }

  for (const event of events) {
    try {
      const [victimName, actorName] = await Promise.all([
        resolveDisplay(event.victim as Address),
        resolveDisplay(event.actor as Address),
      ])

      let text: string
      if (event.type === 'stuck') {
        text = `🖐️ ${actorName} just stuck a Kick Me sign on ${victimName}! 🎯\n\n${SITE_URL}/${event.victim}`
      } else {
        const kickText = event.totalKicks === 1 ? '1 kick' : `${event.totalKicks ?? 0} kicks`
        text = `🦵 ${actorName} just kicked ${victimName}! That's ${kickText} total! 💥\n\n${SITE_URL}/${event.victim}`
      }

      await twitter.v2.tweet(text)
      console.log(`Tweeted: ${text}`)
    } catch (err) {
      console.error(`Failed to tweet ${event.type} event:`, err)
    }
  }
}
