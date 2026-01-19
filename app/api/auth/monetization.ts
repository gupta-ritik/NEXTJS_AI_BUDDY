import jwt from "jsonwebtoken"
import {
  addUserCreditsById,
  debitUserCreditsById,
  findUserByEmail,
  setUserRoleByEmail,
  type AppUser,
} from "./user-repository"

export const CREDIT_CONFIG = {
  FREE_STARTING_CREDITS: 5,
  AI_CALL_COST: 1,
  REFERRAL_BONUS_NEW_USER: 5,
  REFERRAL_BONUS_REFERRER: 5,
} as const

function getBearerToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null
  return authHeader.slice("Bearer ".length)
}

export async function requireUser(req: Request): Promise<AppUser> {
  const token = getBearerToken(req)
  if (!token) {
    throw new Error("UNAUTHORIZED")
  }

  const secret = process.env.JWT_SECRET || "dev-secret"
  let decoded: any
  try {
    decoded = jwt.verify(token, secret)
  } catch {
    throw new Error("UNAUTHORIZED")
  }

  const email = typeof decoded?.email === "string" ? decoded.email : null
  if (!email) {
    throw new Error("UNAUTHORIZED")
  }

  const user = await findUserByEmail(email)
  if (!user) {
    throw new Error("UNAUTHORIZED")
  }

  // Bootstrap admin: treat a configured email as admin.
  // Set ADMIN_EMAIL in your env for production; defaults to the requested email in dev.
  const adminEmail = (process.env.ADMIN_EMAIL || "ritik1262003@gmail.com").trim().toLowerCase()
  if (adminEmail && user.email.trim().toLowerCase() === adminEmail) {
    if (user.role !== "admin") {
      try {
        await setUserRoleByEmail(user.email, "admin")
      } catch {
        // ignore DB errors; still allow admin access for this configured email
      }
    }
    return { ...user, role: "admin" }
  }

  return user
}

export async function authorizeAiCall(req: Request, cost = CREDIT_CONFIG.AI_CALL_COST) {
  const user = await requireUser(req)

  const safeCost = Number.isFinite(cost) ? Math.max(0, Math.trunc(cost)) : 0
  if (safeCost <= 0) {
    return { user, rollback: async () => {} }
  }

  // Free users: reserve credits up-front (atomic when RPC is installed)
  if (user.role === "free") {
    try {
      await debitUserCreditsById(user.id, safeCost)
    } catch (err) {
      if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
        throw new Error("OUT_OF_CREDITS")
      }
      throw err
    }
  }

  // If the downstream AI call fails, refund the reservation.
  const rollback = async () => {
    if (user.role !== "free") return
    try {
      await addUserCreditsById(user.id, safeCost)
    } catch (e) {
      console.error("Failed to refund credits", e)
    }
  }

  return { user, rollback }
}
