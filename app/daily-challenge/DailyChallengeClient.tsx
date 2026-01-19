"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"

type ChallengeQuestion = {
  idx: number
  question: string
  options: string[]
  difficulty: "easy" | "medium" | "hard" | string
  topic?: string | null
}

type TodayResponse = {
  date: string
  totalQuestions: number
  completed: boolean
  questions: ChallengeQuestion[]
  user?: {
    xp: number
    dailyStreak: number
    bestDailyStreak: number
    lastDailyChallengeDate: string | null
    streakBroken: boolean
    previousStreak: number
  }
  attempt?: {
    answers: string[]
    score: number
    totalQuestions: number
    xpEarned: number
    completedAt: string
  }
  solutions?: { idx: number; answer: string; explanation: string | null }[]
  error?: string
  hint?: string
}

type SubmitResponse = {
  date: string
  completed: boolean
  alreadySubmitted: boolean
  score: number
  totalQuestions: number
  xpEarned: number
  streak?: number
  bestStreak?: number
  xpTotal?: number
  streakBroken?: boolean
  previousStreak?: number
  solutions: { idx: number; answer: string; explanation: string | null }[]
  correctness?: boolean[]
  error?: string
  hint?: string
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem("token")
  } catch {
    return null
  }
}

export default function DailyChallengeClient() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [today, setToday] = useState<TodayResponse | null>(null)

  const [answers, setAnswers] = useState<string[]>([])
  const [result, setResult] = useState<SubmitResponse | null>(null)
  const [streakWarning, setStreakWarning] = useState<string | null>(null)

  const canSubmit = useMemo(() => {
    if (!today || today.completed) return false
    return answers.length === today.questions.length && answers.every((a) => typeof a === "string" && a.length > 0)
  }, [today, answers])

  const load = async () => {
    setLoading(true)
    setError(null)

    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }

    try {
      const res = await fetch("/api/daily-challenge/today", {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })

      const body = (await res.json().catch(() => ({}))) as TodayResponse

      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        if (res.status === 501) {
          throw new Error(body.hint || body.error || "Daily Challenge is not configured.")
        }
        throw new Error(body.error || "Failed to load Daily Challenge")
      }

      setToday(body)
      setAnswers(body.completed && body.attempt?.answers ? body.attempt.answers : new Array(body.questions.length).fill(""))
      setResult(null)

      const broken = body?.user?.streakBroken === true
      const prev = typeof body?.user?.previousStreak === "number" ? body.user.previousStreak : 0
      if (broken) {
        const msg = `Streak broken. You missed a day — your previous streak was ${prev} day${prev === 1 ? "" : "s"}. Start again today!`
        setStreakWarning(msg)
        try {
          const key = `ai-study-buddy:streak-broken-alert:${body.date}`
          const already = window.localStorage.getItem(key)
          if (!already) {
            window.localStorage.setItem(key, "1")
            window.alert(msg)
          }
        } catch {
          // ignore
        }
      } else {
        setStreakWarning(null)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onPick = (qIdx: number, option: string) => {
    setAnswers((prev) => {
      const next = prev.length ? [...prev] : []
      while (next.length < (today?.questions.length || 0)) next.push("")
      next[qIdx] = option
      return next
    })
  }

  const onSubmit = async () => {
    if (!today) return
    setSubmitting(true)
    setError(null)

    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }

    try {
      const res = await fetch("/api/daily-challenge/submit", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers }),
      })

      const body = (await res.json().catch(() => ({}))) as SubmitResponse
      if (!res.ok) {
        if (res.status === 401) {
          router.push("/login")
          return
        }
        if (res.status === 501) {
          throw new Error(body.hint || body.error || "Daily Challenge is not configured.")
        }
        throw new Error(body.error || "Failed to submit")
      }

      setResult(body)

      if (body?.streakBroken) {
        const prev = typeof body.previousStreak === "number" ? body.previousStreak : 0
        const msg = `Streak broken. You missed a day — your previous streak was ${prev} day${prev === 1 ? "" : "s"}. Start again today!`
        setStreakWarning(msg)
        try {
          const key = `ai-study-buddy:streak-broken-submit-alert:${body.date}`
          const already = window.localStorage.getItem(key)
          if (!already) {
            window.localStorage.setItem(key, "1")
            window.alert(msg)
          }
        } catch {
          // ignore
        }
      }

      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  const solutionsByIdx = useMemo(() => {
    const map = new Map<number, { answer: string; explanation: string | null }>()
    const solutions = result?.solutions || today?.solutions || []
    solutions.forEach((s) => map.set(s.idx, { answer: s.answer, explanation: s.explanation }))
    return map
  }, [today, result])

  return (
    <main className="min-h-screen px-4 py-10 md:py-14">
      <div className="mx-auto w-full max-w-3xl space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-100">Daily AI Challenge</h1>
            <p className="mt-1 text-sm text-slate-400">5 questions · mixed difficulty · XP + streaks</p>
          </div>
          <Link
            href="/dashboard"
            className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-100 hover:border-indigo-400 hover:text-indigo-200"
          >
            Back to Dashboard
          </Link>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-[11px] text-slate-400">
              {today?.date ? `Today: ${today.date}` : ""}
              {today?.completed ? " · Completed" : ""}
            </div>
            <button
              type="button"
              onClick={load}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition disabled:opacity-60"
            >
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>

          {error && <p className="mt-3 text-[11px] text-red-300">{error}</p>}

          {streakWarning && (
            <div className="mt-3 rounded-2xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-[11px] text-amber-100">
              <p className="font-semibold">Streak alert</p>
              <p className="mt-1 text-amber-100/90">{streakWarning}</p>
            </div>
          )}

          {loading ? (
            <p className="mt-4 text-sm text-slate-300">Loading your daily challenge…</p>
          ) : !today ? (
            <p className="mt-4 text-sm text-slate-300">Unable to load today’s challenge.</p>
          ) : (
            <div className="mt-4 space-y-4">
              {today.questions.map((q) => {
                const selected = answers[q.idx] || ""
                const solution = solutionsByIdx.get(q.idx)
                const reveal = Boolean(today.completed || result)
                const isCorrect = reveal && solution ? selected === solution.answer : null

                return (
                  <div key={q.idx} className="rounded-2xl border border-slate-800 bg-slate-950/30 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-slate-100">
                        {q.idx + 1}. {q.question}
                      </p>
                      <div className="flex items-center gap-2 text-[10px] text-slate-400">
                        <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5">
                          {String(q.difficulty).toUpperCase()}
                        </span>
                        {q.topic && (
                          <span className="rounded-full border border-slate-700 bg-slate-900/60 px-2 py-0.5">
                            {q.topic}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 grid gap-2">
                      {q.options.map((opt) => (
                        <label
                          key={opt}
                          className={`flex cursor-pointer items-start gap-2 rounded-xl border px-3 py-2 text-xs transition ${
                            selected === opt
                              ? "border-indigo-500 bg-indigo-500/10 text-slate-100"
                              : "border-slate-800 bg-slate-950/40 text-slate-200 hover:border-slate-700"
                          } ${today.completed ? "cursor-default opacity-90" : ""}`}
                        >
                          <input
                            type="radio"
                            name={`q-${q.idx}`}
                            value={opt}
                            checked={selected === opt}
                            disabled={today.completed}
                            onChange={() => onPick(q.idx, opt)}
                            className="mt-0.5"
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>

                    {reveal && solution && (
                      <div className="mt-3 rounded-xl border border-slate-800 bg-slate-950/40 p-3 text-[11px]">
                        <p className={`font-semibold ${isCorrect ? "text-emerald-200" : "text-red-200"}`}>
                          {isCorrect ? "Correct" : "Incorrect"} · Answer: {solution.answer}
                        </p>
                        {solution.explanation && (
                          <p className="mt-1 text-slate-300">{solution.explanation}</p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {!today.completed && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
                  <p className="text-[11px] text-slate-400">Finish all questions to submit and earn XP.</p>
                  <button
                    type="button"
                    onClick={onSubmit}
                    disabled={!canSubmit || submitting}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition disabled:opacity-60"
                  >
                    {submitting ? "Submitting…" : "Submit answers"}
                  </button>
                </div>
              )}

              {(result || today.attempt) && (
                <div className="rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
                  <p className="text-sm font-semibold text-slate-100">Today’s result</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[11px]">
                    <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                      Score: {(result?.score ?? today.attempt?.score)}/{(result?.totalQuestions ?? today.attempt?.totalQuestions)}
                    </span>
                    <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                      XP earned: {result?.xpEarned ?? today.attempt?.xpEarned ?? 0}
                    </span>
                    {typeof result?.streak === "number" && (
                      <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                        Streak: {result.streak} day{result.streak === 1 ? "" : "s"}
                      </span>
                    )}
                    {typeof result?.bestStreak === "number" && (
                      <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                        Best: {result.bestStreak}
                      </span>
                    )}
                    {typeof result?.xpTotal === "number" && (
                      <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                        Total XP: {result.xpTotal}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
