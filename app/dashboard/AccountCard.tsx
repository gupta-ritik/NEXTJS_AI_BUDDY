"use client"

import { useMemo, useState } from "react"

type AuthMeResponse = {
  email?: string
  role?: "free" | "pro" | "admin"
  credits?: number
  referralCode?: string | null
  error?: string
}

function getTokenFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem("token")
  } catch {
    return null
  }
}

function roleBadge(role: AuthMeResponse["role"]) {
  if (role === "admin") return "bg-red-500/15 text-red-200 border-red-500/40"
  if (role === "pro") return "bg-emerald-500/15 text-emerald-200 border-emerald-500/40"
  return "bg-slate-500/10 text-slate-200 border-slate-500/30"
}

export default function AccountCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [role, setRole] = useState<AuthMeResponse["role"] | undefined>(undefined)
  const [credits, setCredits] = useState<number | null>(null)

  const isUnlimited = useMemo(() => role === "pro" || role === "admin", [role])

  const load = async () => {
    setLoading(true)
    setError(null)

    const token = getTokenFromLocalStorage()
    if (!token) {
      setLoading(false)
      setError("You are not logged in.")
      return
    }

    try {
      const res = await fetch("/api/auth/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const body = (await res.json().catch(() => ({}))) as AuthMeResponse

      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized. Please log in again.")
        throw new Error(body.error || "Failed to load account")
      }

      setEmail(typeof body.email === "string" ? body.email : null)
      setRole(body.role)
      setCredits(typeof body.credits === "number" ? body.credits : null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="scroll-reveal relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-sky-500/5 to-emerald-500/10 opacity-40 pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">👤</span>
            <h2 className="text-sm md:text-base font-semibold">Account</h2>
          </div>
          {role && (
            <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${roleBadge(role)}`}>
              {role.toUpperCase()}
            </span>
          )}
        </div>

        <p className="text-[11px] md:text-sm text-slate-400">
          See your current plan and credits.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition disabled:opacity-60"
          >
            {loading ? "Loading…" : email || role || credits !== null ? "Refresh" : "Load account"}
          </button>

          {(email || role || credits !== null) && (
            <div className="flex flex-wrap gap-2 text-[11px]">
              {email && (
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                  {email}
                </span>
              )}

              <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                Credits: {isUnlimited ? "Unlimited" : credits ?? "—"}
              </span>

              {role === "admin" && (
                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-200">
                  Admin access enabled
                </span>
              )}
            </div>
          )}
        </div>

        {error && <p className="text-[11px] text-red-300">{error}</p>}
      </div>
    </section>
  )
}
