import { useEffect, useState } from 'react'
import { PULL_THRESHOLD, pullDistance, pullPhase } from '../lib/pullToRefresh'

/**
 * Pull down from the top of any page to refresh it, everywhere in the app (mounted once in App).
 * Installed on the iPhone home screen there is no browser pull-to-refresh, so this is it. It
 * reloads the page, which also picks up a newly deployed version. It stays out of the way of
 * sheets (the Log sheet scrolls inside itself), sideways swipes and normal scrolling.
 */
export function PullToRefresh() {
  const [pull, setPull] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    let startX = 0, startY = 0, active = false, dist = 0

    const onStart = (e: TouchEvent) => {
      active = e.touches.length === 1 && window.scrollY <= 0 && !(e.target as Element | null)?.closest?.('.overlay')
      if (!active) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
      dist = 0
    }
    const onMove = (e: TouchEvent) => {
      if (!active) return
      const dy = e.touches[0].clientY - startY
      const dx = e.touches[0].clientX - startX
      if (window.scrollY > 0 || dy < 0 || (dist === 0 && Math.abs(dx) > Math.abs(dy))) {
        active = false
        dist = 0
        setPull(0)
        setDragging(false)
        return
      }
      dist = pullDistance(dy)
      if (dist > 0) {
        setDragging(true)
        setPull(dist)
        if (e.cancelable) e.preventDefault()
      }
    }
    const onEnd = () => {
      if (!active) return
      active = false
      setDragging(false)
      if (pullPhase(dist) === 'release') {
        setRefreshing(true)
        setPull(PULL_THRESHOLD)
        window.setTimeout(() => window.location.reload(), 250)
      } else {
        setPull(0)
      }
    }

    window.addEventListener('touchstart', onStart, { passive: true })
    window.addEventListener('touchmove', onMove, { passive: false })
    window.addEventListener('touchend', onEnd)
    window.addEventListener('touchcancel', onEnd)
    return () => {
      window.removeEventListener('touchstart', onStart)
      window.removeEventListener('touchmove', onMove)
      window.removeEventListener('touchend', onEnd)
      window.removeEventListener('touchcancel', onEnd)
    }
  }, [])

  if (pull === 0 && !refreshing) return null
  const phase = pullPhase(pull)
  return (
    <div
      className={`ptr${dragging ? ' dragging' : ''}`}
      style={{ transform: `translate(-50%, ${pull}px)`, opacity: Math.min(1, pull / 30) }}
      role="status"
    >
      <span className={`ptr-icon${refreshing ? ' spin' : ''}`} style={refreshing ? undefined : { transform: `rotate(${phase === 'release' ? 180 : (pull / PULL_THRESHOLD) * 180}deg)` }} aria-hidden="true">↓</span>
      {refreshing ? 'Refreshing…' : phase === 'release' ? 'Release to refresh' : 'Pull to refresh'}
    </div>
  )
}
