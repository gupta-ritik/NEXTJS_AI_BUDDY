import { NextResponse } from "next/server"
import { requireUser } from "../monetization"

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)

    return NextResponse.json({
      email: user.email,
      role: user.role,
      credits: user.credits,
      referralCode: user.referral_code ?? null,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("AUTH_ME error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
