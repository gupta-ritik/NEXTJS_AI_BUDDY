import { NextResponse } from "next/server"
import { requireUser } from "../../auth/monetization"
import { getSupabaseClient } from "../../auth/supabaseClient"

type DbDailyChallenge = {
  id: string
  challenge_date: string
}

type DbDailyQuestion = {
  idx: number
  question: string
  options: unknown
  answer: string
  explanation: string | null
}

function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function utcYesterday(dateStr: string) {
  const d = new Date(dateStr + "T00:00:00Z")
  d.setUTCDate(d.getUTCDate() - 1)
  return d.toISOString().slice(0, 10)
}

function isMissingDailyChallengeSchemaError(err: any) {
  const code = typeof err?.code === "string" ? err.code : ""
  const message = typeof err?.message === "string" ? err.message : ""
  const details = typeof err?.details === "string" ? err.details : ""
  const text = `${message} ${details}`.toLowerCase()

  if (code === "42P01" || code === "42703") return true
  if (text.includes("daily_challenge") || text.includes("daily_challenges")) return true
  return false
}

function normalizeOptions(options: unknown): string[] {
  if (Array.isArray(options)) {
    return options.map((o) => String(o)).filter((s) => s.trim().length > 0).slice(0, 4)
  }
  return []
}

async function getDailyChallengeForDate(dateStr: string): Promise<DbDailyChallenge | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("daily_challenges")
    .select("id, challenge_date")
    .eq("challenge_date", dateStr)
    .maybeSingle<DbDailyChallenge>()

  if (error) {
    if (isMissingDailyChallengeSchemaError(error)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("daily_challenges select error", error)
    throw new Error("Database error")
  }
  return data ?? null
}

async function loadQuestions(challengeId: string): Promise<DbDailyQuestion[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("daily_challenge_questions")
    .select("idx, question, options, answer, explanation")
    .eq("challenge_id", challengeId)
    .order("idx", { ascending: true })

  if (error) {
    if (isMissingDailyChallengeSchemaError(error)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("daily_challenge_questions select error", error)
    throw new Error("Database error")
  }
  return (data || []) as DbDailyQuestion[]
}

async function loadUserStats(userId: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("app_users")
    .select("xp, daily_streak, best_daily_streak, last_daily_challenge_date")
    .eq("id", userId)
    .maybeSingle<{
      xp: number
      daily_streak: number
      best_daily_streak: number
      last_daily_challenge_date: string | null
    }>()

  if (error) {
    if (isMissingDailyChallengeSchemaError(error)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("app_users stats select error", error)
    throw new Error("Database error")
  }

  return {
    xp: typeof data?.xp === "number" ? data.xp : 0,
    dailyStreak: typeof data?.daily_streak === "number" ? data.daily_streak : 0,
    bestDailyStreak: typeof data?.best_daily_streak === "number" ? data.best_daily_streak : 0,
    lastDate: data?.last_daily_challenge_date ?? null,
  }
}

async function updateUserStats(params: {
  userId: string
  today: string
  xpEarned: number
}) {
  const current = await loadUserStats(params.userId)

  const yesterday = utcYesterday(params.today)

  const streakBroken = Boolean(
    current.lastDate &&
      current.lastDate !== params.today &&
      current.lastDate !== yesterday &&
      current.dailyStreak > 0,
  )
  const previousStreak = streakBroken ? current.dailyStreak : 0

  let nextStreak = 1
  if (current.lastDate === params.today) {
    nextStreak = current.dailyStreak
  } else if (current.lastDate === yesterday) {
    nextStreak = current.dailyStreak + 1
  }

  const nextXp = current.xp + Math.max(0, Math.trunc(params.xpEarned))
  const nextBest = Math.max(current.bestDailyStreak, nextStreak)

  const supabase = getSupabaseClient()
  const { error } = await supabase
    .from("app_users")
    .update({
      xp: nextXp,
      daily_streak: nextStreak,
      best_daily_streak: nextBest,
      last_daily_challenge_date: params.today,
    })
    .eq("id", params.userId)

  if (error) {
    if (isMissingDailyChallengeSchemaError(error)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("app_users stats update error", error)
    throw new Error("Database error")
  }

  return {
    xp: nextXp,
    dailyStreak: nextStreak,
    bestDailyStreak: nextBest,
    lastDailyChallengeDate: params.today,
    streakBroken,
    previousStreak,
  }
}

export async function POST(req: Request) {
  try {
    const user = await requireUser(req)
    const body = await req.json().catch(() => ({}))
    const answers = Array.isArray(body?.answers) ? body.answers.map((x: any) => String(x)) : []

    const today = utcDateString()
    const challenge = await getDailyChallengeForDate(today)
    if (!challenge) {
      return NextResponse.json(
        { error: "Daily Challenge not ready yet. Open today's challenge first." },
        { status: 400 },
      )
    }

    const questions = await loadQuestions(challenge.id)
    if (questions.length < 5) {
      return NextResponse.json(
        { error: "Daily Challenge not ready yet. Try again in a moment." },
        { status: 400 },
      )
    }

    if (answers.length !== questions.length) {
      return NextResponse.json(
        { error: `Please answer all ${questions.length} questions.` },
        { status: 400 },
      )
    }

    for (let i = 0; i < questions.length; i++) {
      const opts = normalizeOptions(questions[i].options)
      if (!opts.includes(answers[i])) {
        return NextResponse.json(
          { error: `Invalid answer for question ${i + 1}.` },
          { status: 400 },
        )
      }
    }

    let score = 0
    const correctness = questions.map((q, i) => {
      const correct = answers[i] === q.answer
      if (correct) score += 1
      return correct
    })

    const total = questions.length
    const baseXp = 10
    const perCorrectXp = 2
    const perfectBonus = score === total ? 5 : 0
    const xpEarned = baseXp + score * perCorrectXp + perfectBonus

    const supabase = getSupabaseClient()

    const { error: insertAttemptError } = await supabase.from("daily_challenge_attempts").insert({
      challenge_id: challenge.id,
      user_id: user.id,
      answers,
      score,
      total_questions: total,
      xp_earned: xpEarned,
    })

    if (insertAttemptError) {
      if (isMissingDailyChallengeSchemaError(insertAttemptError)) {
        throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
      }
      // Idempotency: already submitted today
      if (insertAttemptError.code === "23505") {
        const { data: existingAttempt, error: existingError } = await supabase
          .from("daily_challenge_attempts")
          .select("answers, score, total_questions, xp_earned, completed_at")
          .eq("user_id", user.id)
          .eq("challenge_id", challenge.id)
          .maybeSingle<{
            answers: unknown
            score: number
            total_questions: number
            xp_earned: number
            completed_at: string
          }>()

        if (existingError || !existingAttempt) {
          console.error("daily_challenge_attempts re-select error", existingError)
          throw new Error("Database error")
        }

        return NextResponse.json({
          date: today,
          completed: true,
          alreadySubmitted: true,
          score: existingAttempt.score,
          totalQuestions: existingAttempt.total_questions,
          xpEarned: existingAttempt.xp_earned,
          completedAt: existingAttempt.completed_at,
          solutions: questions.map((q) => ({ idx: q.idx, answer: q.answer, explanation: q.explanation })),
        })
      }

      console.error("daily_challenge_attempts insert error", insertAttemptError)
      throw new Error("Database error")
    }

    const updated = await updateUserStats({ userId: user.id, today, xpEarned })

    return NextResponse.json({
      date: today,
      completed: true,
      alreadySubmitted: false,
      score,
      totalQuestions: total,
      xpEarned,
      streak: updated.dailyStreak,
      bestStreak: updated.bestDailyStreak,
      xpTotal: updated.xp,
      streakBroken: updated.streakBroken,
      previousStreak: updated.previousStreak,
      solutions: questions.map((q) => ({ idx: q.idx, answer: q.answer, explanation: q.explanation })),
      correctness,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "DAILY_CHALLENGE_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Daily Challenge is not configured in Supabase yet.",
          hint: "Run supabase/setup.sql in Supabase SQL Editor to create daily challenge tables and XP/streak columns.",
        },
        { status: 501 },
      )
    }
    console.error("DAILY_CHALLENGE_SUBMIT error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
