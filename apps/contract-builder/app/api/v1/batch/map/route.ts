import { generateText, Output } from 'ai'
import { z } from 'zod'
import { BUFI_CONTRACT_FIELDS, type BufiFieldKey } from '@/types/batch'

const fieldMappingSchema = z.object({
  mappings: z.array(
    z.object({
      csvColumn: z.string(),
      bufiField: z.enum([
        'recipientName', 'recipientEmail', 'recipientWallet', 'recipientRole',
        'contractTitle', 'amount', 'currency', 'milestoneTitle',
        'milestoneDescription', 'milestoneDueDate', 'paymentSchedule', 'notes', 'skip',
      ]),
      confidence: z.number().min(0).max(1),
    })
  ),
})

export async function POST(req: Request) {
  try {
    const body = await req.json()

    // Route 1: CSV column mapping
    if (body.columns) {
      const { columns } = body as {
        columns: { name: string; sampleValues: string[] }[]
      }

      const bufiFieldDescriptions = BUFI_CONTRACT_FIELDS
        .map((f) => `- ${f.key}: ${f.label} (${f.description})${f.required ? ' [REQUIRED]' : ''}`)
        .join('\n')

      const columnDescriptions = columns
        .map((c) => `- "${c.name}" (samples: ${c.sampleValues.slice(0, 3).join(', ') || 'empty'})`)
        .join('\n')

      const { output } = await generateText({
        model: 'anthropic/claude-sonnet-4-20250514',
        output: Output.object({ schema: fieldMappingSchema }),
        prompt: `You are a field-mapping assistant for BUFI, a smart contract platform.

Given CSV columns, map each to the best matching BUFI contract field.

BUFI fields:
${bufiFieldDescriptions}

CSV columns:
${columnDescriptions}

Rules:
- Every CSV column must be mapped to exactly one BUFI field or "skip"
- Do not map two CSV columns to the same BUFI field
- Set confidence 0.9+ for obvious matches, 0.5-0.8 for partial matches
- If no good match, use "skip" with confidence 0
- recipientName and recipientEmail are the most important fields
- Look at sample values to infer what the column contains`,
      })

      return Response.json({ mappings: output?.mappings ?? [] })
    }

    // Route 2: Natural language -> structured recipients
    if (body.text) {
      const recipientSchema = z.object({
        recipients: z.array(
          z.object({
            name: z.string(),
            email: z.string(),
            walletAddress: z.string().nullable(),
            role: z.string().nullable(),
            amount: z.number(),
            currency: z.string(),
            milestoneTitle: z.string().nullable(),
            milestoneDescription: z.string().nullable(),
            notes: z.string().nullable(),
          })
        ),
      })

      const { output } = await generateText({
        model: 'anthropic/claude-sonnet-4-20250514',
        output: Output.object({ schema: recipientSchema }),
        prompt: `You are a data extraction assistant for BUFI, a smart contract platform.

Extract recipient information from the following text and structure it as contract recipients.

Text:
${body.text}

Rules:
- Extract every distinct person/organization mentioned as a recipient
- If amounts are mentioned, use them; otherwise set amount to 0
- Default currency to "USDC" unless another is specified
- If roles like "grantee", "vendor", "contractor" are mentioned, include them
- Generate reasonable milestone titles from context if possible
- Leave fields null if not inferrable`,
      })

      return Response.json({ recipients: output?.recipients ?? [] })
    }

    return Response.json({ error: 'Request must include either "columns" or "text"' }, { status: 400 })
  } catch (error) {
    console.error('Batch map error:', error)
    return Response.json({ error: 'Failed to process mapping request' }, { status: 500 })
  }
}
