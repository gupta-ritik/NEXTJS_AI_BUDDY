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
      xp: typeof user.xp === "number" ? user.xp : 0,
      dailyStreak: typeof user.daily_streak === "number" ? user.daily_streak : 0,
      bestDailyStreak: typeof user.best_daily_streak === "number" ? user.best_daily_streak : 0,
      lastDailyChallengeDate: user.last_daily_challenge_date ?? null,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("AUTH_ME error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
