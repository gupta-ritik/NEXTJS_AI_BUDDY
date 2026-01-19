import { NextResponse } from "next/server"
import { requireUser } from "../../../auth/monetization"
import { getSupabaseClient } from "../../../auth/supabaseClient"

const MAX_LIMIT = 100

export async function GET(req: Request) {
  try {
    const admin = await requireUser(req)
    if (admin.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const url = new URL(req.url)
    const q = (url.searchParams.get("q") || "").trim().toLowerCase()
    const limitRaw = Number(url.searchParams.get("limit") || 25)
    const offsetRaw = Number(url.searchParams.get("offset") || 0)

    const limit = Number.isFinite(limitRaw) ? Math.min(MAX_LIMIT, Math.max(1, Math.trunc(limitRaw))) : 25
    const offset = Number.isFinite(offsetRaw) ? Math.max(0, Math.trunc(offsetRaw)) : 0

    const supabase = getSupabaseClient()

    let query = supabase
      .from("app_users")
      .select(
        "id,email,role,credits,referral_code,referred_by,created_at,provider,verified",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })

    if (q) {
      // Simple case-insensitive search by email
      query = query.ilike("email", `%${q}%`)
    }

    const { data, error, count } = await query.range(offset, offset + limit - 1)

    if (error) {
      console.error("ADMIN users list error", error)
      return NextResponse.json({ error: "Database error" }, { status: 500 })
    }

    return NextResponse.json({
      users: data ?? [],
      total: count ?? null,
      limit,
      offset,
      nextOffset: (data?.length || 0) === limit ? offset + limit : null,
      prevOffset: offset - limit >= 0 ? offset - limit : null,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    console.error("ADMIN users list error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
