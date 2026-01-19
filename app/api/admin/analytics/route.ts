import { NextResponse } from "next/server"
import { requireUser } from "../../auth/monetization"
import { getSupabaseClient } from "../../auth/supabaseClient"

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)
    if (user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const supabase = getSupabaseClient()

    const { count: usersCount, error: usersErr } = await supabase
      .from("app_users")
      .select("id", { count: "exact", head: true })

    if (usersErr) {
      console.error("ADMIN analytics users count error", usersErr)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({ usersCount: usersCount ?? 0 })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("ADMIN analytics error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
