import { useEffect } from 'react'

export function useInfiniteScroll({ targetRef, enabled, onLoadMore, rootMargin = '320px' }) {
  useEffect(() => {
    if (!enabled || !targetRef?.current || typeof IntersectionObserver === 'undefined') {
      return undefined
    }

    let cancelled = false

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries
        if (!entry?.isIntersecting || cancelled) {
          return
        }

        onLoadMore?.()
      },
      {
        root: null,
        rootMargin,
        threshold: 0.01,
      },
    )

    observer.observe(targetRef.current)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [enabled, onLoadMore, rootMargin, targetRef])
}
