import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"
import { NextResponse } from "next/server"

interface User {
  email: string
  passwordHash: string
}

// Demo user: replace with your DB lookup
const users: User[] = [
  {
    email: "test@example.com",
    // hash for password "password123" (generate your own in signup flow)
    passwordHash: "$2a$10$Q.7h4NDVlpHfVEfM3D7E1OeZ2iXH1giF2p2PB0pH1zMDV1HKGpKkW",
  },
]

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      )
    }

    const user = users.find((u) => u.email === email)
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const ok = await bcrypt.compare(password, user.passwordHash)
    if (!ok) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const secret = process.env.JWT_SECRET
    if (!secret) {
      console.error("JWT_SECRET env var is not set")
      return NextResponse.json(
        { error: "Server configuration error" },
        { status: 500 }
      )
    }

    const token = jwt.sign({ email }, secret, { expiresIn: "7d" })

    return NextResponse.json({ token }, { status: 200 })
  } catch (err) {
    console.error("Login error:", err)
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}
