type SignInPanelProps = {
  email: string
  setEmail: (value: string) => void
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void
}

export function SignInPanel({ email, setEmail, onSubmit }: SignInPanelProps) {
  return (
    <section className="card">
      <h2>Sign in</h2>
      <p>Use Supabase magic link authentication.</p>
      <form onSubmit={onSubmit} className="formGrid">
        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            required
          />
        </label>
        <button type="submit">Send magic link</button>
      </form>
    </section>
  )
}
