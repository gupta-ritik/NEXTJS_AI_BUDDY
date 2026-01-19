import { getSupabaseClient } from "./supabaseClient"
import crypto from "crypto"
import { CREDIT_CONFIG } from "./monetization"

export type AppUser = {
  id: string
  email: string
  password_hash: string | null
  verified: boolean | null
  verification_token: string | null
  provider: "credentials" | "google" | null
  google_id: string | null
  first_name?: string | null
  last_name?: string | null
  mobile?: string | null
  role: "free" | "pro" | "admin"
  credits: number
  referral_code?: string | null
  referred_by?: string | null
}

function isMissingReferralSchemaError(err: any) {
  const code = typeof err?.code === "string" ? err.code : ""
  const message = typeof err?.message === "string" ? err.message : ""
  const details = typeof err?.details === "string" ? err.details : ""
  const text = `${message} ${details}`.toLowerCase()

  // Postgres undefined_column: 42703
  if (code === "42703") return true
  if (text.includes("referral_code") || text.includes("referred_by")) return true
  return false
}

function normalizeReferralCode(code: string) {
  return code.trim().toUpperCase()
}

async function generateUniqueReferralCode(): Promise<string> {
  const supabase = getSupabaseClient()
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = crypto.randomBytes(4).toString("hex").toUpperCase() // 8 chars
    const { data, error } = await supabase
      .from("app_users")
      .select("id")
      .eq("referral_code", code)
      .maybeSingle<{ id: string }>()

    if (error) {
      console.error("Supabase generateUniqueReferralCode check error", error)
      if (isMissingReferralSchemaError(error)) {
        throw new Error("REFERRALS_NOT_CONFIGURED")
      }
      throw new Error("Database error")
    }

    if (!data) return code
  }
  throw new Error("REFERRAL_CODE_GENERATION_FAILED")
}

export async function findUserByEmail(email: string): Promise<AppUser | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", email)
    .maybeSingle<AppUser>()

  if (error) {
    console.error("Supabase findUserByEmail error", error)
    throw new Error("Database error")
  }

  return data ?? null
}

export async function createCredentialsUser(params: {
  email: string
  passwordHash: string
  firstName?: string | null
  lastName?: string | null
  mobile?: string | null
}): Promise<void> {
  const supabase = getSupabaseClient()

  const referralCode = await generateUniqueReferralCode()

  const { error } = await supabase.from("app_users").insert({
    email: params.email,
    password_hash: params.passwordHash,
    verified: true,
    verification_token: null,
    provider: "credentials",
    google_id: null,
    first_name: params.firstName ?? null,
    last_name: params.lastName ?? null,
    mobile: params.mobile ?? null,
    role: "free",
    credits: CREDIT_CONFIG.FREE_STARTING_CREDITS,
    referral_code: referralCode,
    referred_by: null,
  })

  if (error) {
    console.error("Supabase createCredentialsUser error", error)
    if (error.code === "23505") {
      throw new Error("DUPLICATE_EMAIL")
    }
    throw new Error(error.message || error.details || "Database error")
  }
}

export async function findUserByVerificationToken(token: string): Promise<AppUser | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("verification_token", token)
    .maybeSingle<AppUser>()

  if (error) {
    console.error("Supabase findUserByVerificationToken error", error)
    throw new Error("Database error")
  }
  return data ?? null
}

export async function markUserVerifiedById(id: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("app_users")
    .update({ verified: true, verification_token: null })
    .eq("id", id)

  if (error) {
    console.error("Supabase markUserVerifiedById error", error)
    throw new Error("Database error")
  }
}

export async function setUserOtpTokenById(id: string, token: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("app_users")
    .update({ verification_token: token })
    .eq("id", id)

  if (error) {
    console.error("Supabase setUserOtpTokenById error", error)
    throw new Error("Database error")
  }
}

export async function upsertGoogleUser(params: {
  email: string
  googleId: string | null
  emailVerified: boolean
}): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: existing, error: findError } = await supabase
    .from("app_users")
    .select("*")
    .eq("email", params.email)
    .maybeSingle<AppUser>()

  if (findError) {
    console.error("Supabase upsertGoogleUser find error", findError)
    throw new Error("Database error")
  }

  if (!existing) {
    const referralCode = await generateUniqueReferralCode()
    const { error: insertError } = await supabase.from("app_users").insert({
      email: params.email,
      password_hash: null,
      verified: params.emailVerified,
      verification_token: null,
      provider: "google",
      google_id: params.googleId,
      role: "free",
      credits: CREDIT_CONFIG.FREE_STARTING_CREDITS,
      referral_code: referralCode,
      referred_by: null,
    })
    if (insertError) {
      console.error("Supabase upsertGoogleUser insert error", insertError)
      throw new Error("Database error")
    }
  } else {
    const { error: updateError } = await supabase
      .from("app_users")
      .update({
        verified: params.emailVerified,
        verification_token: null,
        provider: "google",
        google_id: params.googleId,
      })
      .eq("id", existing.id)

    if (updateError) {
      console.error("Supabase upsertGoogleUser update error", updateError)
      throw new Error("Database error")
    }
  }
}

export async function findUserById(id: string): Promise<AppUser | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("app_users").select("*").eq("id", id).maybeSingle<AppUser>()
  if (error) {
    console.error("Supabase findUserById error", error)
    throw new Error("Database error")
  }
  return data ?? null
}

export async function findUserByReferralCode(code: string): Promise<AppUser | null> {
  const supabase = getSupabaseClient()
  const normalized = normalizeReferralCode(code)
  const { data, error } = await supabase
    .from("app_users")
    .select("*")
    .eq("referral_code", normalized)
    .maybeSingle<AppUser>()

  if (error) {
    console.error("Supabase findUserByReferralCode error", error)
    if (isMissingReferralSchemaError(error)) {
      throw new Error("REFERRALS_NOT_CONFIGURED")
    }
    throw new Error("Database error")
  }
  return data ?? null
}

export async function setUserReferralCodeById(id: string, referralCode: string): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("app_users")
    .update({ referral_code: normalizeReferralCode(referralCode) })
    .eq("id", id)

  if (error) {
    console.error("Supabase setUserReferralCodeById error", error)
    if (isMissingReferralSchemaError(error)) {
      throw new Error("REFERRALS_NOT_CONFIGURED")
    }
    throw new Error("Database error")
  }
}

export async function updateUserCreditsById(id: string, credits: number): Promise<void> {
  const supabase = getSupabaseClient()
  const safeCredits = Number.isFinite(credits) ? Math.max(0, Math.floor(credits)) : 0
  const { error } = await supabase.from("app_users").update({ credits: safeCredits }).eq("id", id)
  if (error) {
    console.error("Supabase updateUserCreditsById error", error)
    throw new Error("Database error")
  }
}

export async function setUserRoleByEmail(
  email: string,
  role: "free" | "pro" | "admin",
): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase.from("app_users").update({ role }).eq("email", email)
  if (error) {
    console.error("Supabase setUserRoleByEmail error", error)
    throw new Error("Database error")
  }
}

async function tryAdjustCreditsViaRpc(params: {
  userId: string
  delta: number
  requireNonNegative?: boolean
}): Promise<number | null> {
  const supabase = getSupabaseClient()
  const delta = Number.isFinite(params.delta) ? Math.trunc(params.delta) : 0
  if (delta === 0) return null

  // Optional SQL function (recommended) for atomic credit updates.
  // See ARCHITECTURE.md for the function definition.
  const { data, error } = await supabase.rpc("sb_adjust_credits", {
    p_user_id: params.userId,
    p_delta: delta,
    p_require_non_negative: params.requireNonNegative === true,
  })

  if (error) {
    // If the function isn't installed, fall back to non-atomic behavior.
    const msg = (error as any)?.message ? String((error as any).message) : ""
    if (msg.toLowerCase().includes("function") && msg.toLowerCase().includes("sb_adjust_credits")) {
      return null
    }
    if (msg.toUpperCase().includes("INSUFFICIENT_CREDITS")) {
      throw new Error("INSUFFICIENT_CREDITS")
    }
    console.error("Supabase sb_adjust_credits rpc error", error)
    throw new Error("Database error")
  }

  // RPC returns a scalar integer (new credits)
  if (typeof data === "number") return data
  if (typeof (data as any) === "string" && /^\d+$/.test(String(data))) return Number(data)
  return null
}

export async function debitUserCreditsById(id: string, cost: number): Promise<void> {
  const safeCost = Number.isFinite(cost) ? Math.max(0, Math.trunc(cost)) : 0
  if (safeCost <= 0) return

  // Preferred: atomic debit via RPC
  const rpcResult = await tryAdjustCreditsViaRpc({ userId: id, delta: -safeCost, requireNonNegative: true })
  if (rpcResult !== null) return

  // Fallback (non-atomic): read -> write
  const user = await findUserById(id)
  if (!user) throw new Error("User not found")
  if ((user.credits ?? 0) < safeCost) throw new Error("INSUFFICIENT_CREDITS")
  await updateUserCreditsById(id, (user.credits ?? 0) - safeCost)
}

export async function addUserCreditsById(id: string, delta: number): Promise<void> {
  const safeDelta = Number.isFinite(delta) ? Math.trunc(delta) : 0
  if (safeDelta === 0) return

  // Preferred: atomic adjust via RPC
  const rpcResult = await tryAdjustCreditsViaRpc({ userId: id, delta: safeDelta, requireNonNegative: false })
  if (rpcResult !== null) return

  // Fallback (non-atomic)
  const user = await findUserById(id)
  if (!user) throw new Error("User not found")
  const next = (user.credits ?? 0) + safeDelta
  await updateUserCreditsById(id, next)
}

export async function setUserReferredByById(id: string, referrerUserId: string | null): Promise<void> {
  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("app_users")
    .update({ referred_by: referrerUserId })
    .eq("id", id)

  if (error) {
    console.error("Supabase setUserReferredByById error", error)
    throw new Error("Database error")
  }
}

export async function ensureReferralCodeForUser(user: AppUser): Promise<string> {
  if (user.referral_code && user.referral_code.trim()) return user.referral_code
  const newCode = await generateUniqueReferralCode()
  await setUserReferralCodeById(user.id, newCode)
  return newCode
}

export async function applyReferralOnSignup(params: {
  newUserEmail: string
  referralCode: string
}): Promise<{ applied: boolean; reason?: string }> {
  const code = normalizeReferralCode(params.referralCode)
  if (!code) return { applied: false, reason: "EMPTY_CODE" }

  const newUser = await findUserByEmail(params.newUserEmail)
  if (!newUser) return { applied: false, reason: "NEW_USER_NOT_FOUND" }

  if (newUser.referred_by) {
    return { applied: false, reason: "ALREADY_REFERRED" }
  }

  const referrer = await findUserByReferralCode(code)
  if (!referrer) return { applied: false, reason: "INVALID_CODE" }
  if (referrer.id === newUser.id) return { applied: false, reason: "SELF_REFERRAL" }

  // Make it idempotent: only the first caller can set referred_by.
  const supabase = getSupabaseClient()
  const { data: updated, error: updateErr } = await supabase
    .from("app_users")
    .update({ referred_by: referrer.id })
    .eq("id", newUser.id)
    .is("referred_by", null)
    .select("id")
    .maybeSingle<{ id: string }>()

  if (updateErr) {
    console.error("Supabase applyReferralOnSignup referred_by update error", updateErr)
    throw new Error("Database error")
  }

  if (!updated) {
    return { applied: false, reason: "ALREADY_REFERRED" }
  }

  await addUserCreditsById(newUser.id, CREDIT_CONFIG.REFERRAL_BONUS_NEW_USER)
  await addUserCreditsById(referrer.id, CREDIT_CONFIG.REFERRAL_BONUS_REFERRER)

  return { applied: true }
}
