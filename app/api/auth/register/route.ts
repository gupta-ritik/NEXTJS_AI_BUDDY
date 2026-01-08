import bcrypt from "bcryptjs"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { users } from "../users-store"
import { sendVerificationEmail } from "../email"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  const existing = users.find((u) => u.email === email)
  if (existing) {
    return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const verificationToken = crypto.randomBytes(32).toString("hex")

  users.push({
    email,
    passwordHash: hashed,
    verified: false,
    verificationToken,
    provider: "credentials",
    googleId: null,
  })

  console.log("REGISTER: user stored (unverified)", { email, usersCount: users.length })

  try {
    await sendVerificationEmail(email, verificationToken)
  } catch (err) {
    console.error("Error sending verification email", err)
  }

  return NextResponse.json({ success: true, message: "Account created. Check your email to verify your address." })
}
