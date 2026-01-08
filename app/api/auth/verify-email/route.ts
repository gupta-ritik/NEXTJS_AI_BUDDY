import { NextResponse } from "next/server"
import { findUserByVerificationToken, markUserVerifiedById } from "../user-repository"

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const token = url.searchParams.get("token")

    if (!token) {
      return NextResponse.json({ error: "Missing verification token" }, { status: 400 })
    }

    const user = await findUserByVerificationToken(token)
    if (!user) {
      return NextResponse.json({ error: "Invalid or expired verification link" }, { status: 400 })
    }

    await markUserVerifiedById(user.id)

    console.log("EMAIL VERIFIED", { email: user.email })

    const dest = new URL("/login?verified=1", url.origin)
    return NextResponse.redirect(dest)
  } catch (err) {
    console.error("VERIFY EMAIL ERROR", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
