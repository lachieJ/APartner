import type { FormEvent } from 'react'

type AuthActionResult = {
  ok: boolean
  error?: string
}

type UseAuthActionsParams = {
  sendMagicLinkRequest: () => Promise<AuthActionResult>
  signOutRequest: () => Promise<AuthActionResult>
  resetForm: () => void
  setMessage: (value: string | null) => void
  setError: (value: string | null) => void
  clearStatus: () => void
}

export function useAuthActions({
  sendMagicLinkRequest,
  signOutRequest,
  resetForm,
  setMessage,
  setError,
  clearStatus,
}: UseAuthActionsParams) {
  const sendMagicLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearStatus()

    const result = await sendMagicLinkRequest()
    if (!result.ok) {
      setError(result.error ?? 'Sign-in failed.')
      return
    }

    setMessage('Magic link sent. Open your email and return to this app.')
  }

  const signOut = async () => {
    const result = await signOutRequest()
    if (!result.ok) {
      setError(result.error ?? 'Sign-out failed.')
      return
    }

    resetForm()
    setMessage('Signed out.')
  }

  return {
    sendMagicLink,
    signOut,
  }
}
