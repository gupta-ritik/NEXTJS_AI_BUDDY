import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import { findUserByEmail, setUserOtpTokenById } from "../user-repository"
import { sendOtpEmail } from "../email"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("LOGIN BODY:", body)

    const { email, password } = body

    const user = await findUserByEmail(email)
    console.log("USER FOUND:", user)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const match = await bcrypt.compare(password, user.password_hash || "")
    console.log("PASSWORD MATCH:", match)

    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Generate a 6-digit OTP and store it with a timestamp in verification_token
    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const payload = JSON.stringify({ otp, createdAt: Date.now() })

    try {
      await setUserOtpTokenById(user.id, payload)
    } catch (err) {
      console.error("LOGIN: setUserOtpTokenById error", err)
      return NextResponse.json({ error: "Server error" }, { status: 500 })
    }

    try {
      await sendOtpEmail(email, otp)
    } catch (err) {
      console.error("LOGIN: sendOtpEmail error", err)
    }

    const smtpConfigured =
      !!process.env.SMTP_HOST && !!process.env.SMTP_USER && !!process.env.SMTP_PASS
    const isDev = process.env.NODE_ENV !== "production"

    // Localhost/dev convenience: if SMTP isn't configured, return the OTP so you can test end-to-end.
    if (isDev && !smtpConfigured) {
      return NextResponse.json({ otpRequired: true, devOtp: otp })
    }

    return NextResponse.json({ otpRequired: true })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
