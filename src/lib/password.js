import { Buffer } from 'node:buffer'
import { randomBytes, scrypt, timingSafeEqual } from 'node:crypto'
import { MIN_PASSWORD_LENGTH } from './dealers'

// scrypt ships with Node, so account passwords can be stored properly without
// pulling in bcrypt or argon2. Format: scrypt$<salt-hex>$<derived-hex>.
const KEY_LENGTH = 64
const PREFIX = 'scrypt'

function derive(password, salt) {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, KEY_LENGTH, (error, key) => {
      if (error) reject(error)
      else resolve(key)
    })
  })
}

export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex')
  const key = await derive(password, salt)

  return `${PREFIX}$${salt}$${key.toString('hex')}`
}

export async function verifyPassword(password, stored) {
  if (typeof stored !== 'string') {
    return false
  }

  const [prefix, salt, digest] = stored.split('$')

  if (prefix !== PREFIX || !salt || !digest) {
    return false
  }

  const expected = Buffer.from(digest, 'hex')
  const actual = await derive(password, salt)

  // Length check first: timingSafeEqual throws on a mismatch rather than
  // returning false.
  return expected.length === actual.length && timingSafeEqual(expected, actual)
}

export function validatePassword(password) {
  if (password.length < MIN_PASSWORD_LENGTH) {
    return `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`
  }

  return ''
}
