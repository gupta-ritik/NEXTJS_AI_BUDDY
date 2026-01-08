import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let client: SupabaseClient | null = null

export function getSupabaseClient() {
  if (client) return client

  const url = process.env.SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !key) {
    throw new Error("Supabase is not configured. Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.")
  }

  client = createClient(url, key, {
    auth: { persistSession: false },
  })

  return client
}
