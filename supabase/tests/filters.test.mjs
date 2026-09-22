// Tests the preset chips, selection and search rules.  Run: node --test supabase/tests/filters.test.mjs
import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  topPresets, toggleSelected, isSelected, hasSelection, emptySelection,
  matchesVisit, matchesCafe, matchesSearch, SORT_OPTIONS,
} from '../../app/src/lib/filters.ts'

const f = (goodFor = [], drinks = [], amenities = []) => ({ goodFor, drinks, amenities })

test('top presets: the 3 most-used per category, most-used first', () => {
  const visits = [
    f(['Friends', 'Dates'], ['Latte'], ['Wi-Fi']),
    f(['Friends'], ['Latte', 'Mocha'], ['Wi-Fi', 'Power outlets']),
    f(['Friends', 'Solo work'], ['Flat white'], ['Wi-Fi']),
    f(['Dates', 'Reading', 'Meetings'], ['Latte', 'Espresso'], []),
  ]
  const p = topPresets(visits)
  assert.deepEqual(p.goodFor, ['Friends', 'Dates', 'Meetings'])   // Friends 3, Dates 2, then a 1-count tie broken A-Z: Meetings
  assert.deepEqual(p.drinks, ['Latte', 'Espresso', 'Flat white'])  // Latte 3, then 1-count ties A-Z
  assert.deepEqual(p.amenities, ['Wi-Fi', 'Power outlets'])        // only two exist: two chips
})

test('top presets: a feature counts once per VISIT, not once per mention', () => {
  const p = topPresets([f([], ['Latte', 'latte', 'LATTE']), f([], ['Mocha']), f([], ['Mocha'])])
  assert.equal(p.drinks[0], 'Mocha')      // Mocha is on 2 visits; Latte, however often repeated in one visit, is on 1
  assert.equal(p.drinks[1], 'Latte')
})

test('top presets: spelling and capitalisation variants are one drink', () => {
  const p = topPresets([f([], ['Flat white']), f([], ['flat  white ']), f([], ['Latte'])])
  assert.equal(p.drinks.length, 2)
  assert.match(p.drinks[0], /^flat white$/i)
})

test('top presets: nothing logged means no chips; the limit is respected', () => {
  assert.deepEqual(topPresets([]), { goodFor: [], drinks: [], amenities: [] })
  assert.deepEqual(topPresets([f(['A', 'B', 'C', 'D', 'E'])], 3).goodFor.length, 3)
  assert.deepEqual(topPresets([f(['A', 'B'])], 3).goodFor, ['A', 'B'])
})

test('selecting: toggling a chip on and off, case-insensitively, without changing the original', () => {
  const a = emptySelection()
  const b = toggleSelected(a, 'drinks', 'Latte')
  assert.deepEqual(a, emptySelection())
  assert.equal(isSelected(b, 'drinks', 'latte'), true)
  assert.equal(hasSelection(b), true)
  const c = toggleSelected(b, 'drinks', 'LATTE')
  assert.equal(hasSelection(c), false)
})

test('one visit: chips in the same group mean ANY of them', () => {
  const sel = toggleSelected(toggleSelected(emptySelection(), 'goodFor', 'Dates'), 'goodFor', 'Friends')
  assert.equal(matchesVisit(f(['Friends']), sel), true)
  assert.equal(matchesVisit(f(['Dates']), sel), true)
  assert.equal(matchesVisit(f(['Reading']), sel), false)
  assert.equal(matchesVisit(f([]), sel), false)
})

test('one visit: different groups must ALL be satisfied', () => {
  const sel = toggleSelected(toggleSelected(emptySelection(), 'goodFor', 'Friends'), 'amenities', 'Wi-Fi')
  assert.equal(matchesVisit(f(['Friends'], [], ['Wi-Fi']), sel), true)
  assert.equal(matchesVisit(f(['Friends'], [], []), sel), false)
  assert.equal(matchesVisit(f([], [], ['Wi-Fi']), sel), false)
})

test('nothing selected matches everything', () => {
  assert.equal(matchesVisit(f(), emptySelection()), true)
  assert.equal(matchesCafe([], emptySelection()), true)
})

test('a cafe with several visits: each chosen group needs one visit that has it, not necessarily the same visit', () => {
  const sel = toggleSelected(toggleSelected(emptySelection(), 'goodFor', 'Friends'), 'drinks', 'Latte')
  assert.equal(matchesCafe([f(['Friends']), f([], ['Latte'])], sel), true)    // friends on one visit, latte on another
  assert.equal(matchesCafe([f(['Friends']), f(['Dates'])], sel), false)      // never a latte
  assert.equal(matchesCafe([], sel), false)
})

test('search: every word has to appear, in any order, ignoring case; blank matches all', () => {
  const hay = ['Dose Espresso', 'Banani', 'Dhaka', 'Flat white', null, undefined]
  assert.equal(matchesSearch('dose flat', hay), true)
  assert.equal(matchesSearch('WHITE   banani', hay), true)
  assert.equal(matchesSearch('dose mocha', hay), false)
  assert.equal(matchesSearch('   ', hay), true)
  assert.equal(matchesSearch('', []), true)
  assert.equal(matchesSearch('x', []), false)
})

test('the four sort options', () => {
  assert.deepEqual(SORT_OPTIONS.map((o) => o.value), ['recent', 'score', 'visits', 'name'])
})
