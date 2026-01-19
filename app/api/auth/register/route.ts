import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import { applyReferralOnSignup, createCredentialsUser, findUserByEmail } from "../user-repository"

export async function POST(req: Request) {
  const { email, password, firstName, lastName, mobile, referralCode } = await req.json()

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
  try {
    await createCredentialsUser({
      email,
      passwordHash: hashed,
      firstName: firstName || null,
      lastName: lastName || null,
      mobile: mobile || null,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "DUPLICATE_EMAIL") {
      return NextResponse.json({ error: "This email is already registered" }, { status: 400 })
    }
    console.error("REGISTER: createCredentialsUser error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }

  console.log("REGISTER: user stored", { email })

  if (typeof referralCode === "string" && referralCode.trim()) {
    try {
      await applyReferralOnSignup({ newUserEmail: email, referralCode })
    } catch (err) {
      console.error("REGISTER: applyReferralOnSignup error", err)
      // Do not fail registration if referral processing fails
    }
  }

  return NextResponse.json({ success: true, message: "Account created. You can now sign in." })
}
