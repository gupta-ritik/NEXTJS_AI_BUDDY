"use client"

import Link from "next/link"
import { useMemo, useState } from "react"

type AuthMeResponse = {
  email?: string
  role?: "free" | "pro" | "admin"
  credits?: number
  referralCode?: string | null
  xp?: number
  dailyStreak?: number
  bestDailyStreak?: number
  lastDailyChallengeDate?: string | null
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

function todayUtc() {
  return new Date().toISOString().slice(0, 10)
}

export default function DailyChallengeCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [xp, setXp] = useState<number | null>(null)
  const [streak, setStreak] = useState<number | null>(null)
  const [bestStreak, setBestStreak] = useState<number | null>(null)
  const [lastDate, setLastDate] = useState<string | null>(null)

  const doneToday = useMemo(() => {
    if (!lastDate) return false
    return lastDate === todayUtc()
  }, [lastDate])

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
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      const body = (await res.json().catch(() => ({}))) as AuthMeResponse
      if (!res.ok) {
        if (res.status === 401) throw new Error("Unauthorized. Please log in again.")
        throw new Error(body.error || "Failed to load Daily Challenge status")
      }

      setXp(typeof body.xp === "number" ? body.xp : 0)
      setStreak(typeof body.dailyStreak === "number" ? body.dailyStreak : 0)
      setBestStreak(typeof body.bestDailyStreak === "number" ? body.bestDailyStreak : 0)
      setLastDate(body.lastDailyChallengeDate ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="scroll-reveal relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-amber-500/10 via-indigo-500/5 to-emerald-500/10 opacity-40 pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔥</span>
            <h2 className="text-sm md:text-base font-semibold">Daily AI Challenge</h2>
          </div>
          {doneToday && (
            <span className="inline-flex items-center rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-200">
              Completed today
            </span>
          )}
        </div>

        <p className="text-[11px] md:text-sm text-slate-400">
          5 questions/day · Mixed difficulty · Earn XP and build your streak.
        </p>

        <div className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
          <Link
            href="/daily-challenge"
            className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition"
          >
            Open today’s challenge
          </Link>

          <button
            type="button"
            onClick={load}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition disabled:opacity-60"
          >
            {loading ? "Loading…" : xp !== null || streak !== null ? "Refresh" : "Load status"}
          </button>
        </div>

        {(xp !== null || streak !== null || bestStreak !== null) && (
          <div className="flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
              XP: {xp ?? "—"}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
              Streak: {streak ?? "—"}
            </span>
            <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
              Best: {bestStreak ?? "—"}
            </span>
          </div>
        )}

        {error && <p className="text-[11px] text-red-300">{error}</p>}
      </div>
    </section>
  )
}
