import { createLogger } from '@bu/logger'

const logger = createLogger({ prefix: 'escrow-decrypt' })

/**
 * Decrypt AES-256-GCM encrypted responses from CRE confidential workflows.
 * The encryption key comes from env var, NEVER from client requests.
 */
export async function decryptConfidentialResponse(
  encryptedBase64: string,
  encryptionKeyHex: string,
): Promise<string> {
  const encrypted = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0))

  // AES-256-GCM: first 12 bytes = IV, rest = ciphertext + auth tag
  const iv = encrypted.slice(0, 12)
  const ciphertext = encrypted.slice(12)

  const keyBytes = new Uint8Array(
    encryptionKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16)),
  )

  const key = await crypto.subtle.importKey('raw', keyBytes, 'AES-GCM', false, ['decrypt'])

  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext)

  return new TextDecoder().decode(decrypted)
}
