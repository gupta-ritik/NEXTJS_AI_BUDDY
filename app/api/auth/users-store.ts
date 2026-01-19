export interface User {
  email: string
  passwordHash: string
  verified?: boolean
  verificationToken?: string | null
  provider?: "credentials" | "google"
  googleId?: string | null
  role: "free" | "pro" | "admin"
  credits: number
  referralCode?: string | null
  referredBy?: string | null
}

// Simple in-memory user store for demo purposes only.
// Uses a global singleton so it survives module reloads in dev.

const globalUsers = (globalThis as any)._studyBuddyUsers as User[] | undefined

export const users: User[] = globalUsers ?? ((globalThis as any)._studyBuddyUsers = [])
