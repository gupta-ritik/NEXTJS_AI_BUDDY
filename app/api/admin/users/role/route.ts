import { NextResponse } from "next/server"
import { requireUser } from "../../../auth/monetization"
import { getSupabaseClient } from "../../../auth/supabaseClient"

export async function POST(req: Request) {
  try {
    const admin = await requireUser(req)
    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const { email, role } = await req.json()
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (role !== "free" && role !== "pro" && role !== "admin") {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    const supabase = getSupabaseClient()
    const { error } = await supabase.from("app_users").update({ role }).eq("email", email)

    if (error) {
      console.error("ADMIN set role error", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("ADMIN set role error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
