import assert from 'node:assert/strict'
import test from 'node:test'
import { broadcastSubmitState } from '../src/lib/broadcasts.js'

test('a broadcast cannot be submitted before its recipient count loads', () => {
  assert.deepEqual(
    broadcastSubmitState({
      hasFile: true,
      sending: false,
      recipients: null,
      storage: true,
    }),
    { disabled: true, label: 'Send' },
  )
})

test('a ready broadcast names its actual audience', () => {
  assert.deepEqual(
    broadcastSubmitState({
      hasFile: true,
      sending: false,
      recipients: 4,
      storage: true,
    }),
    { disabled: false, label: 'Send to 4' },
  )
})
