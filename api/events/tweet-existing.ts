import type { VercelRequest, VercelResponse } from '@vercel/node'
import { list, get } from '@vercel/blob'
import { tweetEvents } from '../lib/twitter'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const backfillSecret = process.env.BACKFILL_SECRET
  const authHeader = req.headers.authorization
  if (!backfillSecret || !authHeader || authHeader !== `Bearer ${backfillSecret}`) {
    return res.status(401).json({ error: 'Unauthorized' })
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
    await tweetEvents(events)

    return res.status(200).json({
      message: `Tweeted ${events.length} events`,
      events: events.map((e: any) => `${e.type}: ${e.actor} -> ${e.victim}`),
    })
  } catch (err) {
    console.error('Error:', err)
    return res.status(500).json({ error: String(err) })
  }
}
