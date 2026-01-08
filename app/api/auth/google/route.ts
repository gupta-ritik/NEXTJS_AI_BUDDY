import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import { OAuth2Client } from "google-auth-library"
import { upsertGoogleUser } from "../user-repository"

const clientId = process.env.GOOGLE_CLIENT_ID
const oauthClient = clientId ? new OAuth2Client(clientId) : null

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { idToken } = body as { idToken?: string }

    if (!idToken) {
      return NextResponse.json({ error: "Missing Google ID token" }, { status: 400 })
    }

    if (!oauthClient || !clientId) {
      console.error("GOOGLE_CLIENT_ID is not configured")
      return NextResponse.json({ error: "Google sign-in is not configured" }, { status: 500 })
    }

    let ticket
    try {
      ticket = await oauthClient.verifyIdToken({ idToken, audience: clientId })
    } catch (err) {
      console.error("Error verifying Google ID token", err)
      return NextResponse.json({ error: "Invalid Google token" }, { status: 401 })
    }

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return NextResponse.json({ error: "Google account has no email" }, { status: 400 })
    }

    const email = payload.email
    const googleId = payload.sub || null
    const emailVerified = payload.email_verified ?? true

    await upsertGoogleUser({ email, googleId, emailVerified })
    console.log("GOOGLE AUTH: user upserted", { email })

    const secret = process.env.JWT_SECRET || "dev-secret"
    const token = jwt.sign({ email }, secret, { expiresIn: "7d" })

    return NextResponse.json({ token })
  } catch (err) {
    console.error("GOOGLE AUTH ERROR", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
