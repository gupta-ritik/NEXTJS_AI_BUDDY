import { NextResponse } from "next/server"
import { users } from "../users-store"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Missing verification token" }, { status: 400 })
    }

    const user = users.find((u) => u.verificationToken === token)
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 })
    }

    user.verified = true
    user.verificationToken = null

    console.log("EMAIL VERIFIED", { email: user.email })

    // Redirect back to login with a small hint
    return NextResponse.redirect("/login?verified=1")
  } catch (err) {
    console.error("VERIFY EMAIL ERROR", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
