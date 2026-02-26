import { useState } from 'react'

export function useStatusMessage() {
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const clearStatus = () => {
    setMessage(null)
    setError(null)
  }

  return {
    message,
    error,
    setMessage,
    setError,
    clearStatus,
  }
}
