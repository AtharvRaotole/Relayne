import OpenAI from 'openai'
import { env } from '../../config/env'

export interface MessageClassification {
  intent:
    | 'maintenance_request'
    | 'maintenance_followup'
    | 'lease_renewal_interest'
    | 'lease_question'
    | 'payment_inquiry'
    | 'general_inquiry'
    | 'complaint'
    | 'unknown'
  sentiment: number // -1 to 1
  summary: string
  hostileScore: number // 0 to 1
}

const client = new OpenAI({ apiKey: env.OPENAI_API_KEY })

export async function classifyMessage(body: string): Promise<MessageClassification> {
  const prompt = `Classify this tenant/property message. Return valid JSON only, no markdown.

Message:
${body.slice(0, 2000)}

Return JSON with:
- intent: one of maintenance_request, maintenance_followup, lease_renewal_interest, lease_question, payment_inquiry, general_inquiry, complaint, unknown
- sentiment: -1 (very negative) to 1 (very positive)
- summary: one sentence summary
- hostileScore: 0 (friendly) to 1 (threatening/legal language/aggressive)`

  const response = await client.chat.completions.create({
    model: 'gpt-4o-mini',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  })

  const text = response.choices[0]?.message?.content ?? '{}'
  const cleaned = text.replace(/```json|```/g, '').trim()

  try {
    const parsed = JSON.parse(cleaned) as Partial<MessageClassification>
    return {
      intent:
        parsed.intent && validIntents.includes(parsed.intent)
          ? parsed.intent
          : 'unknown',
      sentiment: clamp(parsed.sentiment ?? 0, -1, 1),
      summary: String(parsed.summary ?? '').slice(0, 500) || 'No summary',
      hostileScore: clamp(parsed.hostileScore ?? 0, 0, 1),
    }
  } catch {
    return {
      intent: 'unknown',
      sentiment: 0,
      summary: 'Classification failed',
      hostileScore: 0,
    }
  }
}

const validIntents: MessageClassification['intent'][] = [
  'maintenance_request',
  'maintenance_followup',
  'lease_renewal_interest',
  'lease_question',
  'payment_inquiry',
  'general_inquiry',
  'complaint',
  'unknown',
]

function clamp(n: number, min: number, max: number): number {
  return Math.min(Math.max(n, min), max)
}
