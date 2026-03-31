import {
  ConsensusAggregationByFields,
  HTTPClient,
  type HTTPSendRequester,
  type Runtime,
} from '@chainlink/cre-sdk'
import { getLLMCaller, getSecretKeyForProvider } from '../adapters/llm'
import { createArtifact } from '../adapters/audit'
import type { Config } from '../main'
import { ANALYZE_DOC_SYSTEM_PROMPT } from '../prompts'

export interface AnalyzeInput {
  agreementId: string
  fileName: string
  contentType: string
  documentBase64: string
}

export async function handleAnalyze(
  runtime: Runtime<Config>,
  input: AnalyzeInput
): Promise<{
  agreementJson: Record<string, unknown>
  artifactHash: string
  storageRef: string
}> {
  const verifierModel = runtime.config.verifier
  const providerSecret = getSecretKeyForProvider(verifierModel.provider)
  const apiKey = runtime.getSecret({ id: providerSecret }).result().value

  const prompt = [
    `Agreement ID: ${input.agreementId}`,
    `File Name: ${input.fileName}`,
    `Content Type: ${input.contentType}`,
    'Document Payload (base64):',
    input.documentBase64,
  ].join('\n')

  const httpClient = new HTTPClient()
  const llmResult = httpClient
    .sendRequest(
      runtime,
      (sendRequester: HTTPSendRequester) => {
        const caller = getLLMCaller(verifierModel.provider, apiKey, {
          provider: verifierModel.provider,
          model: verifierModel.model,
          systemPrompt: ANALYZE_DOC_SYSTEM_PROMPT,
          userPrompt: prompt,
          temperature: 0,
          responseFormat: 'json',
        })
        return { responseText: caller(sendRequester).text }
      },
      ConsensusAggregationByFields<{ responseText: string }>({
        responseText: (vals) => vals[0],
      })
    )(runtime.config)
    .result()

  const agreementJson = JSON.parse(llmResult.responseText) as Record<string, unknown>
  const artifact = await createArtifact(agreementJson, 'AgreementJSON', `agreements/${input.agreementId}`)

  return {
    agreementJson,
    artifactHash: artifact.sha256,
    storageRef: artifact.storageRef,
  }
}
