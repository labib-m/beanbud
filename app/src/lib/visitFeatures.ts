import type { Features } from './filters'
import type { FullVisit } from './types'

/** What a chip can match on one of your own visits: who it suits, the drinks, and the amenities. */
export const featuresOf = (v: FullVisit): Features => ({
  goodFor: v.good_for ?? [],
  drinks: v.visit_drinks.map((d) => d.drink_type),
  amenities: v.amenities ?? [],
})
