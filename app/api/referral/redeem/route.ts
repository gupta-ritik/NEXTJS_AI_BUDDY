import { NextResponse } from "next/server"
import { requireUser } from "../../auth/monetization"
import { applyReferralOnSignup } from "../../auth/user-repository"

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const { code } = await req.json()

    if (!code || typeof code !== "string") {
      return NextResponse.json({ error: "Referral code is required" }, { status: 400 })
    }

    const result = await applyReferralOnSignup({ newUserEmail: user.email, referralCode: code })

    if (!result.applied) {
      return NextResponse.json({ applied: false, reason: result.reason }, { status: 400 })
    }

    return NextResponse.json({ applied: true })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("REFERRAL_REDEEM error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
