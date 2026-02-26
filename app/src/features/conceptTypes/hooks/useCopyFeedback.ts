import { useEffect, useRef, useState } from 'react'

export function useCopyFeedback(resetAfterMs = 1200) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const resetTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current)
      }
    }
  }, [])

  const copyValue = async (value: string, copiedValueKey: string) => {
    try {
      await navigator.clipboard.writeText(value)
      setCopiedKey(copiedValueKey)

      if (resetTimeoutRef.current !== null) {
        window.clearTimeout(resetTimeoutRef.current)
      }

      resetTimeoutRef.current = window.setTimeout(() => {
        setCopiedKey((current) => (current === copiedValueKey ? null : current))
        resetTimeoutRef.current = null
      }, resetAfterMs)
    } catch {
      setCopiedKey(null)
    }
  }

  return {
    copiedKey,
    copyValue,
  }
}
