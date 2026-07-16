import { useEffect, useRef, useCallback } from 'react'

/**
 * Hook that calls `onRefresh` when the browser tab becomes visible again
 * after being hidden (e.g. user switched to another tab/app).
 * 
 * It also handles the case where the Supabase connection went stale
 * during the hidden period, by adding a small delay before refreshing.
 */
export function useVisibilityRefresh(onRefresh) {
  const callbackRef = useRef(onRefresh)
  const wasHiddenRef = useRef(false)

  // Always keep the latest callback
  useEffect(() => {
    callbackRef.current = onRefresh
  }, [onRefresh])

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        wasHiddenRef.current = true
      } else if (wasHiddenRef.current) {
        wasHiddenRef.current = false
        // Small delay to let Supabase re-establish its connection
        setTimeout(() => {
          callbackRef.current?.()
        }, 300)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [])
}
