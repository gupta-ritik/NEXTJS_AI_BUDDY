import { NextResponse } from "next/server"
import { requireUser } from "../../../auth/monetization"
import { addUserCreditsById, debitUserCreditsById, findUserByEmail } from "../../../auth/user-repository"

export async function POST(req: Request) {
  try {
    const admin = await requireUser(req)
    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await req.json().catch(() => ({}))
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const delta = Number(body?.delta)

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!Number.isFinite(delta) || Math.trunc(delta) !== delta) {
      return NextResponse.json({ error: "delta must be an integer" }, { status: 400 })
    }

    if (delta === 0) {
      return NextResponse.json({ success: true, credits: null })
    }

    const user = await findUserByEmail(email)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    if (delta < 0) {
      await debitUserCreditsById(user.id, Math.abs(delta))
    } else {
      await addUserCreditsById(user.id, delta)
    }

    const updated = await findUserByEmail(email)
    return NextResponse.json({ success: true, credits: updated?.credits ?? null })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "INSUFFICIENT_CREDITS") {
      return NextResponse.json({ error: "Insufficient credits" }, { status: 400 })
    }
    console.error("ADMIN credits error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
