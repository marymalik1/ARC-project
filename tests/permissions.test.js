import assert from 'node:assert/strict'
import test from 'node:test'
import { CAPABILITIES, can, landingPathFor, permissionsFor } from '../src/lib/permissions.js'

const asRole = (role) => ({ role })

test('Master Administrator holds every capability', () => {
  for (const capability of Object.values(CAPABILITIES)) {
    assert.equal(can(asRole('MASTER_ADMIN'), capability), true, capability)
  }
})

test('Accounts and Sales read and export accounts but never write them', () => {
  for (const role of ['ACCOUNTS', 'SALES']) {
    assert.equal(can(asRole(role), CAPABILITIES.USERS_VIEW), true)
    assert.equal(can(asRole(role), CAPABILITIES.USERS_EXPORT), true)
    assert.equal(can(asRole(role), CAPABILITIES.USERS_MANAGE), false)
    assert.equal(can(asRole(role), CAPABILITIES.CARE_VIEW), false)
  }
})

test('Customer Support is limited to the care module', () => {
  const support = asRole('CUSTOMER_SUPPORT')

  assert.equal(can(support, CAPABILITIES.CARE_VIEW), true)
  assert.equal(can(support, CAPABILITIES.CARE_MANAGE), true)
  assert.equal(can(support, CAPABILITIES.USERS_VIEW), false)
  assert.equal(can(support, CAPABILITIES.USERS_MANAGE), false)
})

test('Management reads both modules and writes to neither', () => {
  const management = asRole('MANAGEMENT')

  assert.equal(can(management, CAPABILITIES.USERS_VIEW), true)
  assert.equal(can(management, CAPABILITIES.CARE_VIEW), true)
  assert.equal(can(management, CAPABILITIES.USERS_MANAGE), false)
  assert.equal(can(management, CAPABILITIES.CARE_MANAGE), false)
})

test('an unknown or missing role grants nothing', () => {
  assert.deepEqual(permissionsFor('NOT_A_ROLE'), [])
  assert.equal(can(null, CAPABILITIES.USERS_VIEW), false)
  assert.equal(can(undefined, CAPABILITIES.CARE_VIEW), false)
  assert.equal(can({}, CAPABILITIES.USERS_VIEW), false)
})

test('lands each role on a module it can actually open', () => {
  assert.equal(landingPathFor(asRole('MASTER_ADMIN')), '/')
  assert.equal(landingPathFor(asRole('ACCOUNTS')), '/')
  assert.equal(landingPathFor(asRole('MANAGEMENT')), '/')
  // Customer Support cannot open "/", so it must not be sent there.
  assert.equal(landingPathFor(asRole('CUSTOMER_SUPPORT')), '/customer-care')
  assert.equal(landingPathFor(null), '/login')
})
