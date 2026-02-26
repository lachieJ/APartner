import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY

const looksLikePlaceholder = (value: string) =>
  value.includes('YOUR_PROJECT_REF') ||
  value.includes('YOUR_SUPABASE_PUBLISHABLE_KEY') ||
  value.includes('YOUR_SUPABASE_ANON_KEY')

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing VITE_SUPABASE_URL and key. Set VITE_SUPABASE_PUBLISHABLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY.',
  )
}

if (looksLikePlaceholder(supabaseUrl) || looksLikePlaceholder(supabasePublishableKey)) {
  throw new Error(
    'Supabase env vars still contain placeholder values. Update app/.env.local with real project URL and publishable key, then restart `npm run dev`.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)
