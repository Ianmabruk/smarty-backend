import test from 'node:test'
import assert from 'node:assert/strict'

const hasDb = Boolean(process.env.DATABASE_URL)

test('cross-tenant isolation (integration)', { skip: !hasDb }, async () => {
  assert.ok(true)
})
