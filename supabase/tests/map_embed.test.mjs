// Tests app/src/lib/mapEmbed.ts.  Run: node --test supabase/tests/map_embed.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mapEmbedUrl, mapQuery } from '../../app/src/lib/mapEmbed.ts'

const cafe = (o = {}) => ({ name: 'Dose Espresso', city: 'Dhaka', area: 'Banani', address: null, ...o })

test('mapQuery: prefers the address, falls back to neighbourhood/city, name always leads', () => {
  assert.equal(mapQuery(cafe({ address: '12 Road 5, Banani' })), 'Dose Espresso, 12 Road 5, Banani')
  assert.equal(mapQuery(cafe({ address: null })), 'Dose Espresso, Banani, Dhaka')
  assert.equal(mapQuery(cafe({ address: '  ' })), 'Dose Espresso, Banani, Dhaka')
  assert.equal(mapQuery(cafe({ address: null, area: '' })), 'Dose Espresso, Dhaka')
})

test('mapEmbedUrl: null with no API key; otherwise a place-mode URL with the query and key encoded', () => {
  assert.equal(mapEmbedUrl(cafe(), undefined), null)
  assert.equal(mapEmbedUrl(cafe(), ''), null)
  const url = mapEmbedUrl(cafe({ address: '12 Road 5, Banani' }), 'AIza-test key/1')
  assert.match(url, /^https:\/\/www\.google\.com\/maps\/embed\/v1\/place\?key=AIza-test%20key%2F1&q=/)
  assert.ok(url.includes(encodeURIComponent('Dose Espresso, 12 Road 5, Banani')))
})
