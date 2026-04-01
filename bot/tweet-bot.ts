import { createPublicClient, http, parseAbiItem, type Address } from 'viem'
import { baseSepolia } from 'viem/chains'
import { mainnet } from 'viem/chains'
import { normalize } from 'viem/ens'
import { TwitterApi } from 'twitter-api-v2'
import { readFileSync, writeFileSync, existsSync } from 'fs'

// ============ Config ============

const CONTRACT_ADDRESS = '0x2000DF70bb743e9A15998cb5D48ceBeDaCdbD22c' as const
const DEPLOY_BLOCK = 37019068n
const SITE_URL = 'https://kickme.wtf'
const STATE_FILE = './bot-state.json'

// Poll interval in ms (default: 30 seconds)
const POLL_INTERVAL = parseInt(process.env.POLL_INTERVAL || '30000')

// Set to 'true' to run once and exit (for cron jobs)
const RUN_ONCE = process.argv.includes('--once')

// Set to 'true' to print tweets instead of posting (for testing)
const DRY_RUN = process.env.DRY_RUN === 'true'

// ============ Clients ============

const chain = baseSepolia // Change to `base` for mainnet
const rpcUrl = process.env.RPC_URL || 'https://base-sepolia-rpc.publicnode.com'

const client = createPublicClient({
  chain,
  transport: http(rpcUrl),
})

const ensClient = createPublicClient({
  chain: mainnet,
  transport: http(process.env.ENS_RPC_URL || 'https://eth.drpc.org'),
})

function getTwitterClient(): TwitterApi | null {
  const appKey = process.env.X_API_KEY
  const appSecret = process.env.X_API_SECRET
  const accessToken = process.env.X_ACCESS_TOKEN
  const accessSecret = process.env.X_ACCESS_SECRET

  if (!appKey || !appSecret || !accessToken || !accessSecret) {
    if (!DRY_RUN) {
      console.error('Missing X API credentials. Set X_API_KEY, X_API_SECRET, X_ACCESS_TOKEN, X_ACCESS_SECRET')
      process.exit(1)
    }
    return null
  }

  return new TwitterApi({ appKey, appSecret, accessToken, accessSecret })
}

// ============ Event ABIs ============

const stuckEvent = parseAbiItem('event Stuck(address indexed victim, address indexed sticker, uint256 tokenId)')
const kickedEvent = parseAbiItem('event Kicked(address indexed victim, address indexed kicker, uint256 totalKicks)')

// ============ State ============

type BotState = {
  lastBlock: string
  tweeted: string[] // tx hashes of already-tweeted events
}

function loadState(): BotState {
  if (existsSync(STATE_FILE)) {
    try {
      return JSON.parse(readFileSync(STATE_FILE, 'utf-8'))
    } catch {
      // corrupted state, start fresh
    }
  }
  return { lastBlock: DEPLOY_BLOCK.toString(), tweeted: [] }
}

function saveState(state: BotState) {
  // Keep only last 500 tweeted hashes to prevent unbounded growth
  if (state.tweeted.length > 500) {
    state.tweeted = state.tweeted.slice(-500)
  }
  writeFileSync(STATE_FILE, JSON.stringify(state, null, 2))
}

// ============ ENS Resolution ============

const ensCache = new Map<string, string>()

async function resolveDisplay(address: Address): Promise<string> {
  const lower = address.toLowerCase()
  if (ensCache.has(lower)) return ensCache.get(lower)!

  try {
    const name = await ensClient.getEnsName({ address })
    if (name) {
      ensCache.set(lower, name)
      return name
    }
  } catch {
    // ENS lookup failed, use truncated address
  }

  const truncated = `${address.slice(0, 6)}...${address.slice(-4)}`
  ensCache.set(lower, truncated)
  return truncated
}

// ============ Tweet Composer ============

async function composeStuckTweet(victim: Address, sticker: Address): Promise<string> {
  const [victimName, stickerName] = await Promise.all([
    resolveDisplay(victim),
    resolveDisplay(sticker),
  ])
  return `🖐️ ${stickerName} stuck a Kick Me sign on ${victimName}\n\n${SITE_URL}/${victim}`
}

async function composeKickedTweet(victim: Address, kicker: Address, totalKicks: bigint): Promise<string> {
  const [victimName, kickerName] = await Promise.all([
    resolveDisplay(victim),
    resolveDisplay(kicker),
  ])
  const kickText = totalKicks === 1n ? '1 kick' : `${totalKicks} kicks`
  return `🦵 ${kickerName} kicked ${victimName} (${kickText} total)\n\n${SITE_URL}/${victim}`
}

// ============ Main Loop ============

async function processEvents() {
  const state = loadState()
  const currentBlock = await client.getBlockNumber()
  const fromBlock = BigInt(state.lastBlock) + 1n

  if (fromBlock > currentBlock) {
    return // no new blocks
  }

  console.log(`Scanning blocks ${fromBlock} to ${currentBlock}...`)

  // Fetch events (chunked for RPC limits)
  const CHUNK = 50000n
  const allStuck: any[] = []
  const allKicked: any[] = []

  for (let start = fromBlock; start <= currentBlock; start += CHUNK) {
    const end = start + CHUNK - 1n > currentBlock ? currentBlock : start + CHUNK - 1n
    const [stuck, kicked] = await Promise.all([
      client.getLogs({ address: CONTRACT_ADDRESS, event: stuckEvent, fromBlock: start, toBlock: end }),
      client.getLogs({ address: CONTRACT_ADDRESS, event: kickedEvent, fromBlock: start, toBlock: end }),
    ])
    allStuck.push(...stuck)
    allKicked.push(...kicked)
  }

  const twitter = getTwitterClient()
  let tweetCount = 0

  // Process stuck events
  for (const log of allStuck) {
    const txHash = log.transactionHash
    if (state.tweeted.includes(txHash)) continue

    const tweet = await composeStuckTweet(log.args.victim, log.args.sticker)

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would tweet:\n${tweet}\n`)
    } else {
      try {
        await twitter!.v2.tweet(tweet)
        console.log(`Tweeted: ${tweet}`)
        tweetCount++
      } catch (err) {
        console.error(`Failed to tweet for tx ${txHash}:`, err)
        continue // don't mark as tweeted so we retry next time
      }
    }

    state.tweeted.push(txHash)
  }

  // Process kicked events
  for (const log of allKicked) {
    const txHash = log.transactionHash
    if (state.tweeted.includes(txHash)) continue

    const tweet = await composeKickedTweet(log.args.victim, log.args.kicker, log.args.totalKicks)

    if (DRY_RUN) {
      console.log(`[DRY RUN] Would tweet:\n${tweet}\n`)
    } else {
      try {
        await twitter!.v2.tweet(tweet)
        console.log(`Tweeted: ${tweet}`)
        tweetCount++
      } catch (err) {
        console.error(`Failed to tweet for tx ${txHash}:`, err)
        continue
      }
    }

    state.tweeted.push(txHash)
  }

  state.lastBlock = currentBlock.toString()
  saveState(state)

  if (tweetCount > 0 || allStuck.length > 0 || allKicked.length > 0) {
    console.log(`Processed ${allStuck.length} sticks, ${allKicked.length} kicks. Tweeted ${tweetCount}.`)
  }
}

// ============ Entry Point ============

async function main() {
  console.log(`Kick Me Tweet Bot started`)
  console.log(`Contract: ${CONTRACT_ADDRESS}`)
  console.log(`RPC: ${rpcUrl}`)
  console.log(`Dry run: ${DRY_RUN}`)
  console.log(`Mode: ${RUN_ONCE ? 'single run' : `polling every ${POLL_INTERVAL / 1000}s`}`)

  if (RUN_ONCE) {
    await processEvents()
    return
  }

  // Continuous polling
  while (true) {
    try {
      await processEvents()
    } catch (err) {
      console.error('Error processing events:', err)
    }
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL))
  }
}

main().catch(console.error)
