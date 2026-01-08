import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"
import { users } from "../users-store"

export async function POST(req: Request) {
  try {
    const body = await req.json()
    console.log("LOGIN BODY:", body)

    const { email, password } = body

    console.log("LOGIN: current users store", users)

    const user = users.find((u) => u.email === email)
    console.log("USER FOUND:", user)

    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    if (user.verified === false) {
      return NextResponse.json({ error: "Please verify your email before logging in." }, { status: 403 })
    }

    const match = await bcrypt.compare(password, user.passwordHash)
    console.log("PASSWORD MATCH:", match)

    if (!match) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET || "dev-secret"

    const token = jwt.sign({ email }, secret, { expiresIn: "7d" })

    return NextResponse.json({ token })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
