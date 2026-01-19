import { NextResponse } from "next/server"
import { requireUser } from "../../auth/monetization"
import { ensureReferralCodeForUser } from "../../auth/user-repository"

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    const code = await ensureReferralCodeForUser(user)

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host")
    const proto = req.headers.get("x-forwarded-proto") || "http"
    const shareUrl = host ? `${proto}://${host}/register?ref=${encodeURIComponent(code)}` : `/register?ref=${encodeURIComponent(code)}`

    return NextResponse.json({ code, shareUrl })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "REFERRALS_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Referrals not configured",
          hint: "Run the referral columns SQL in ARCHITECTURE.md",
        },
        { status: 501 },
      )
    }
    console.error("REFERRAL_ME error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
