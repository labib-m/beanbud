// Tests app/src/lib/stats.ts's drinkStats() price-trend addition. Run: node --test supabase/tests/stats.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { groupByCafe, drinkStats } from '../../app/src/lib/stats.ts'

let n = 0
const cafe = { id: 'c1', name: 'Java House', city: 'Dhaka', area: 'Dhanmondi' }
/** A minimal FullVisit-shaped fixture: only the fields groupByCafe/drinkStats actually read. */
const visit = (date, currency, drinks) => ({
  id: 'v' + ++n, cafe_id: 'c1', visited_on: date, created_at: date + 'T10:00:00Z', overall: 4,
  currency, cafes: cafe, good_for: [], visit_drinks: drinks,
})
const drink = (type, price, score = null) => ({ id: 'd' + ++n, drink_type: type, price, score, sort_order: 0 })

test('drinkStats: lastDate is the most recent visit that included the drink', () => {
  const g = groupByCafe([
    visit('2026-08-01', 'BDT', [drink('Latte', 300)]),
    visit('2026-09-10', 'BDT', [drink('Latte', 320)]),
  ])[0]
  const [latte] = drinkStats(g)
  assert.equal(latte.lastDate, '2026-09-10')
})

test('drinkStats: priceRise when the latest price is higher than the earliest, same currency', () => {
  const g = groupByCafe([
    visit('2026-08-18', 'BDT', [drink('Latte', 300)]),
    visit('2026-09-10', 'BDT', [drink('Latte', 350)]),
  ])[0]
  const [latte] = drinkStats(g)
  assert.deepEqual(latte.priceRise, { amount: 50, since: '2026-08-18', currency: 'BDT' })
})

test('drinkStats: no priceRise when the price fell or stayed the same', () => {
  const g = groupByCafe([
    visit('2026-08-18', 'BDT', [drink('Latte', 350)]),
    visit('2026-09-10', 'BDT', [drink('Latte', 350)]),
  ])[0]
  assert.equal(drinkStats(g)[0].priceRise, null)
})

test('drinkStats: no priceRise across different currencies, and none with fewer than two priced instances', () => {
  const oneVisit = groupByCafe([visit('2026-09-10', 'BDT', [drink('Latte', 350)])])[0]
  assert.equal(drinkStats(oneVisit)[0].priceRise, null)

  const mixedCurrency = groupByCafe([
    visit('2026-08-18', 'THB', [drink('Latte', 120)]),
    visit('2026-09-10', 'BDT', [drink('Latte', 350)]),
  ])[0]
  assert.equal(drinkStats(mixedCurrency)[0].priceRise, null)
})
