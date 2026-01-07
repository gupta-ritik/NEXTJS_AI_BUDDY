import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"

const users: any[] = []

export async function POST(req: Request) {
  const { email, password } = await req.json()

  const hashed = await bcrypt.hash(password, 10)
  users.push({ email, password: hashed })

  return NextResponse.json({ success: true })
}
