// Hand-written to match supabase/migrations. Keep in step when tables change.

export type Verdict = 'regular' | 'return' | 'once' | 'plain' | 'desperate'

export type Cafe = {
  id: string
  name: string
  city: string
  area: string
  address: string | null
  map_url: string | null
  code?: string // e.g. DOSE_DHA_BAN
}

export type ScoreKey = 'ambiance' | 'drinks' | 'food' | 'service' | 'crowd'

export const SCORES: { key: ScoreKey; label: string }[] = [
  { key: 'ambiance', label: 'Ambiance' },
  { key: 'drinks', label: 'Coffee' },
  { key: 'food', label: 'Food' },
  { key: 'service', label: 'Service' },
  { key: 'crowd', label: 'Crowd' },
]

export const GOOD_FOR = ['Solo work', 'Meetings', 'Friends', 'Family', 'Dates', 'Reading', 'Late night', 'Long stays']

export const AMENITIES = [
  'Wi-Fi', 'Power outlets', 'Air conditioning', 'Outdoor seating',
  'Quiet corners', 'Big group table', 'Cards accepted', 'Clean washroom',
]

export const VERDICTS: { value: Verdict; label: string }[] = [
  { value: 'regular', label: 'Make it a regular' },
  { value: 'return', label: 'Worth returning' },
  { value: 'once', label: 'One and done' },
  { value: 'plain', label: 'Regular' },
  { value: 'desperate', label: 'Okay for Desperate Caffeine' },
]

export const PARKING = ['Own lot, easy', 'Valet', 'Street, usually free spots', 'Street, tight', 'No parking', "Didn't drive"]

export const PRICE_BANDS = [
  { value: 1, label: 'Cheap' },
  { value: 2, label: 'Moderate' },
  { value: 3, label: 'Pricey' },
  { value: 4, label: 'A splurge' },
]

export const DEFAULT_DRINKS = [
  'Iced americano', 'Cappuccino', 'Americano', 'Espresso', 'Flat white',
  'Latte', 'Iced latte', 'Cold brew', 'Filter coffee', 'Mocha',
]

// code, symbol, name. The first nine are the common ones for this app.
export const CURRENCIES: [string, string, string][] = [
  ['BDT', '৳', 'Bangladeshi taka'], ['THB', '฿', 'Thai baht'], ['USD', '$', 'US dollar'],
  ['EUR', '€', 'Euro'], ['GBP', '£', 'Pound sterling'], ['INR', '₹', 'Indian rupee'],
  ['AED', 'AED ', 'UAE dirham'], ['SGD', 'S$', 'Singapore dollar'], ['MYR', 'RM', 'Malaysian ringgit'],
  ['JPY', '¥', 'Japanese yen'], ['CNY', 'CN¥', 'Chinese yuan'], ['HKD', 'HK$', 'Hong Kong dollar'],
  ['KRW', '₩', 'South Korean won'], ['TWD', 'NT$', 'New Taiwan dollar'], ['IDR', 'Rp', 'Indonesian rupiah'],
  ['PHP', '₱', 'Philippine peso'], ['VND', '₫', 'Vietnamese dong'], ['AUD', 'A$', 'Australian dollar'],
  ['NZD', 'NZ$', 'New Zealand dollar'], ['CAD', 'C$', 'Canadian dollar'], ['CHF', 'CHF ', 'Swiss franc'],
  ['SEK', 'kr', 'Swedish krona'], ['NOK', 'kr', 'Norwegian krone'], ['DKK', 'kr', 'Danish krone'],
  ['PLN', 'zł', 'Polish zloty'], ['CZK', 'Kč', 'Czech koruna'], ['TRY', '₺', 'Turkish lira'],
  ['SAR', 'SR ', 'Saudi riyal'], ['QAR', 'QR ', 'Qatari riyal'], ['KWD', 'KD ', 'Kuwaiti dinar'],
  ['EGP', 'E£', 'Egyptian pound'], ['ZAR', 'R', 'South African rand'], ['PKR', 'Rs ', 'Pakistani rupee'],
  ['LKR', 'Rs ', 'Sri Lankan rupee'], ['NPR', 'NRs ', 'Nepalese rupee'], ['BRL', 'R$', 'Brazilian real'],
  ['MXN', 'MX$', 'Mexican peso'],
]

export function currencySymbol(code: string): string {
  return CURRENCIES.find((c) => c[0] === code)?.[1] ?? code + ' '
}

/** Input the Log sheet hands to save_visit. Numbers are null when unset. */
export type VisitInput = {
  cafe: { name: string; city: string; area: string; address: string; map_url: string; update_details: boolean }
  visit: {
    visited_on: string
    score_ambiance: number | null
    score_drinks: number | null
    score_food: number | null
    score_service: number | null
    score_crowd: number | null
    verdict: Verdict | ''
    currency: string
    price_band: number | null
    spend: string
    opens: string
    closes: string
    hours_note: string
    parking: string
    parking_note: string
    area_note: string
    good_for: string[]
    amenities: string[]
    public_note: string
  }
  drinks: { drink_type: string; price: number | null; score: number | null }[]
  notes: string
}

/** A visit as the Notebook loads it: every column plus cafe, drinks and your own note. */
export type FullVisit = {
  id: string
  cafe_id: string
  visited_on: string
  created_at: string
  overall: number | null
  score_ambiance: number | null
  score_drinks: number | null
  score_food: number | null
  score_service: number | null
  score_crowd: number | null
  verdict: Verdict | null
  currency: string | null
  price_band: number | null
  spend: string | null
  opens: string | null
  closes: string | null
  hours_note: string | null
  parking: string | null
  parking_note: string | null
  area_note: string | null
  good_for: string[]
  amenities: string[]
  public_note: string | null // shared with everyone (the private note is separate)
  cafe_revisions?: { address: string | null; map_url: string | null } | null // the cafe details this visit was logged under
  cafes: Cafe
  visit_drinks: { id: string; drink_type: string; price: number | null; score: number | null; sort_order: number }[]
  // One-to-one embed: an object (or null). Only ever contains YOUR note.
  visit_notes: { notes: string } | { notes: string }[] | null
}

export function noteOf(v: FullVisit): string {
  const n = v.visit_notes
  if (!n) return ''
  return Array.isArray(n) ? (n[0]?.notes ?? '') : n.notes
}

export function scoreOf(v: FullVisit, key: ScoreKey): number | null {
  return v[`score_${key}` as const]
}

export type Profile = {
  id: string
  display_name: string | null
  handle: string | null
  home_city: string | null
  tagline: string | null
  usual_order: string | null
  about: string | null
  avatar: string | null
}

/** One row of the Feed: a visit by anyone, without notes. */
export type FeedVisit = {
  id: string
  user_id: string
  cafe_id: string
  visited_on: string
  created_at: string
  overall: number | null
  currency: string | null
  good_for: string[]
  amenities: string[]
  public_note: string | null
  cafes: { id: string; name: string; city: string; area: string }
  visit_drinks: { drink_type: string; price: number | null; sort_order: number }[]
  profiles: { display_name: string | null; handle: string | null; avatar: string | null } | null
}

/** Minimal visit used to compute people stats and overlaps. */
export type LiteVisit = {
  user_id: string
  cafe_id: string
  overall: number | null
  visited_on: string
  cafes: { name: string; city: string }
}
