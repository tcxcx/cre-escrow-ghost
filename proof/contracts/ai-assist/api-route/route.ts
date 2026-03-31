// SECURITY: requires auth — contract AI assist streaming
import { NextResponse } from 'next/server'
import { requireAuth, requireRateLimit } from '@bu/api-helpers'
import { getLimiter } from '@bu/kv/ratelimit'
import { createLogger } from '@bu/logger'
import { createContractAssistStream } from '@bu/intelligence'

const logger = createLogger({ prefix: '[contract-ai-assist]' })

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(request: Request) {
  try {
    const [authResult, body] = await Promise.all([
      requireAuth(),
      request.json(),
    ])

    const { user, error: authError } = authResult
    if (authError) return authError

    const userId = user.id

    const { error: rlError } = await requireRateLimit(
      `user:${userId}`,
      getLimiter('ai'),
    )
    if (rlError) return rlError

    const { messages, canvasContext } = body as {
      messages: Array<{ role: 'user' | 'assistant'; content: string }>
      canvasContext?: {
        contractName: string
        nodes: Array<{
          id: string
          type: string
          label: string
          data: Record<string, unknown>
        }>
        edges: Array<{ id: string; source: string; target: string }>
        settings: { chain: string; currency: string; totalAmount: number }
      }
    }

    if (!messages?.length) {
      return NextResponse.json(
        { error: 'messages required' },
        { status: 400 },
      )
    }

    logger.info('Contract AI assist request', {
      userId,
      nodeCount: canvasContext?.nodes?.length ?? 0,
      messageCount: messages.length,
    })

    const result = createContractAssistStream({
      messages,
      canvasContext: canvasContext ?? {
        contractName: 'Untitled',
        nodes: [],
        edges: [],
        settings: { chain: 'base', currency: 'USDC', totalAmount: 0 },
      },
      teamId: userId, // Use userId as fallback — teamId comes from canvas context in this route
      userId,
    })

    return result.toDataStreamResponse()
  } catch (error) {
    logger.error('Contract AI assist error', {
      error: (error as Error).message,
    })
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    )
  }
}
