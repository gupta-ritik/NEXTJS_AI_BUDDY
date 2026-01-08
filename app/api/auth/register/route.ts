import bcrypt from "bcryptjs"
import crypto from "crypto"
import { NextResponse } from "next/server"
import { createCredentialsUser, findUserByEmail } from "../user-repository"
import { sendVerificationEmail } from "../email"

export async function POST(req: Request) {
  const { email, password } = await req.json()

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
  }

  try {
    const existing = await findUserByEmail(email)
    if (existing) {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
    }
  } catch (err) {
    console.error("REGISTER: findUserByEmail error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }

  const hashed = await bcrypt.hash(password, 10)
  const verificationToken = crypto.randomBytes(32).toString("hex")
  try {
    await createCredentialsUser({
      email,
      passwordHash: hashed,
      verificationToken,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "DUPLICATE_EMAIL") {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
    }
    console.error("REGISTER: createCredentialsUser error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }

  console.log("REGISTER: user stored (unverified)", { email })

  try {
    await sendVerificationEmail(email, verificationToken)
  } catch (err) {
    console.error("Error sending verification email", err)
  }

  return NextResponse.json({ success: true, message: "Account created. Check your email to verify your address." })
}
