import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'crypto'
import { env } from '../../config/env'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const TAG_LENGTH = 16
const SALT_LENGTH = 32
const KEY_LENGTH = 32

function getKey(): Buffer {
  const salt = env.ENCRYPTION_KEY.slice(0, SALT_LENGTH).padEnd(SALT_LENGTH)
  return scryptSync(env.ENCRYPTION_KEY, salt, KEY_LENGTH)
}

export function encryptCredentials(plain: object): string {
  const key = getKey()
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv)

  const json = JSON.stringify(plain)
  const encrypted = Buffer.concat([cipher.update(json, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()

  return Buffer.concat([iv, tag, encrypted]).toString('base64')
}

export function decryptCredentials(encrypted: string | object): Record<string, unknown> {
  if (typeof encrypted === 'object') {
    return encrypted as Record<string, unknown>
  }
  const key = getKey()
  const buf = Buffer.from(encrypted, 'base64')
  const iv = buf.subarray(0, IV_LENGTH)
  const tag = buf.subarray(IV_LENGTH, IV_LENGTH + TAG_LENGTH)
  const data = buf.subarray(IV_LENGTH + TAG_LENGTH)

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const json = decipher.update(data) + decipher.final('utf8')
  return JSON.parse(json) as Record<string, unknown>
}
