// The maths of pull-to-refresh: how far the indicator follows a drag, and when letting go refreshes.
// Pure, no imports (tested in supabase/tests/pull_to_refresh.test.mjs).

export const PULL_THRESHOLD = 64
export const PULL_MAX = 100
const RESISTANCE = 0.6

/** How far the indicator moves for a finger drag of `dy` pixels: it lags the finger, then stops. */
export const pullDistance = (dy: number): number => (dy <= 0 ? 0 : Math.min(PULL_MAX, dy * RESISTANCE))

export type PullPhase = 'idle' | 'pull' | 'release'

/** "pull" = keep dragging; "release" = far enough that letting go refreshes. */
export const pullPhase = (distance: number): PullPhase => (distance >= PULL_THRESHOLD ? 'release' : distance > 0 ? 'pull' : 'idle')
