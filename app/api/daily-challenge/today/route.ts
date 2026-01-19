import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { requireUser } from "../../auth/monetization"
import { getSupabaseClient } from "../../auth/supabaseClient"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

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
  difficulty: string
  topic: string | null
}

function utcDateString(d = new Date()) {
  return d.toISOString().slice(0, 10)
}

function isMissingDailyChallengeSchemaError(err: any) {
  const code = typeof err?.code === "string" ? err.code : ""
  const message = typeof err?.message === "string" ? err.message : ""
  const details = typeof err?.details === "string" ? err.details : ""
  const text = `${message} ${details}`.toLowerCase()

  // undefined_table: 42P01, undefined_column: 42703
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

async function getOrCreateDailyChallenge(dateStr: string): Promise<DbDailyChallenge> {
  const supabase = getSupabaseClient()

  const { data: existing, error: existingError } = await supabase
    .from("daily_challenges")
    .select("id, challenge_date")
    .eq("challenge_date", dateStr)
    .maybeSingle<DbDailyChallenge>()

  if (existingError) {
    if (isMissingDailyChallengeSchemaError(existingError)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("daily_challenges select error", existingError)
    throw new Error("Database error")
  }

  if (existing) return existing

  const { error: insertError } = await supabase.from("daily_challenges").insert({
    challenge_date: dateStr,
  })

  if (insertError) {
    // Unique violation (someone else created it) or real error
    if (insertError.code !== "23505") {
      if (isMissingDailyChallengeSchemaError(insertError)) {
        throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
      }
      console.error("daily_challenges insert error", insertError)
      throw new Error("Database error")
    }
  }

  const { data: created, error: createdError } = await supabase
    .from("daily_challenges")
    .select("id, challenge_date")
    .eq("challenge_date", dateStr)
    .maybeSingle<DbDailyChallenge>()

  if (createdError || !created) {
    if (isMissingDailyChallengeSchemaError(createdError)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    console.error("daily_challenges re-select error", createdError)
    throw new Error("Database error")
  }
  return created
}

async function loadQuestions(challengeId: string): Promise<DbDailyQuestion[]> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("daily_challenge_questions")
    .select("idx, question, options, answer, explanation, difficulty, topic")
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

async function ensureQuestions(challenge: DbDailyChallenge): Promise<DbDailyQuestion[]> {
  const existing = await loadQuestions(challenge.id)
  if (existing.length >= 5) return existing

  if (!process.env.GROQ_API_KEY) {
    throw new Error("GROQ_NOT_CONFIGURED")
  }

  const chat = await groq.chat.completions.create({
    model: "llama-3.1-8b-instant",
    messages: [
      {
        role: "system",
        content:
          "You generate a daily study challenge with 5 multiple-choice questions. Respond with STRICT JSON only (no markdown). JSON schema: { questions: Array<{ question: string, options: string[4], answer: string, explanation: string, difficulty: 'easy'|'medium'|'hard', topic: string }> }. Mixed difficulty: include 2 easy, 2 medium, 1 hard. Mix topics across common school subjects (math, science, english, history, basic programming). Keep questions concise, student-friendly, and unambiguous.",
      },
      {
        role: "user",
        content: `Create today's daily challenge for date ${challenge.challenge_date}.`,
      },
    ],
    temperature: 0.7,
  })

  const raw = chat.choices[0]?.message?.content || ""

  let parsed: any
  try {
    let cleaned = raw.trim()
    if (cleaned.startsWith("```")) {
      const firstBrace = cleaned.indexOf("{")
      const lastBrace = cleaned.lastIndexOf("}")
      cleaned =
        firstBrace !== -1 && lastBrace !== -1
          ? cleaned.slice(firstBrace, lastBrace + 1)
          : cleaned
    }
    cleaned = cleaned.replace(/\/\/.*$/gm, "")

    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")
    const jsonString =
      jsonStart !== -1 && jsonEnd !== -1 ? cleaned.slice(jsonStart, jsonEnd + 1) : cleaned

    parsed = JSON.parse(jsonString)
  } catch (e) {
    console.error("Daily challenge: failed to parse AI JSON", e, "raw:", raw)
    throw new Error("CHALLENGE_GENERATION_FAILED")
  }

  const questionsRaw = Array.isArray(parsed?.questions) ? parsed.questions : []
  const questions = questionsRaw
    .map((q: any, idx: number) => {
      const question = typeof q?.question === "string" ? q.question.trim() : ""
      const options: string[] = Array.isArray(q?.options)
        ? q.options.map((o: any) => String(o))
        : []
      const answer = typeof q?.answer === "string" ? q.answer : ""
      const explanation = typeof q?.explanation === "string" ? q.explanation : null
      const difficulty = q?.difficulty === "easy" || q?.difficulty === "medium" || q?.difficulty === "hard" ? q.difficulty : "medium"
      const topic = typeof q?.topic === "string" ? q.topic : null

      const cleanOptions = options.map((o: string) => o.trim()).filter(Boolean)
      if (!question || cleanOptions.length < 4 || !answer) return null
      const normalizedAnswer = answer.trim()
      const normalizedOptions = cleanOptions.slice(0, 4)
      if (!normalizedOptions.includes(normalizedAnswer)) return null
      return {
        idx,
        question,
        options: normalizedOptions,
        answer: normalizedAnswer,
        explanation,
        difficulty,
        topic,
      }
    })
    .filter(Boolean)
    .slice(0, 5) as Array<{
    idx: number
    question: string
    options: string[]
    answer: string
    explanation: string | null
    difficulty: string
    topic: string | null
  }>

  if (questions.length < 5) {
    throw new Error("CHALLENGE_GENERATION_FAILED")
  }

  const supabase = getSupabaseClient()
  const { error: insertQuestionsError } = await supabase.from("daily_challenge_questions").insert(
    questions.map((q) => ({
      challenge_id: challenge.id,
      idx: q.idx,
      question: q.question,
      options: q.options,
      answer: q.answer,
      explanation: q.explanation,
      difficulty: q.difficulty,
      topic: q.topic,
    })),
  )

  if (insertQuestionsError) {
    if (isMissingDailyChallengeSchemaError(insertQuestionsError)) {
      throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
    }
    // Unique violation if another request inserted concurrently; just re-load.
    if (insertQuestionsError.code !== "23505") {
      console.error("daily_challenge_questions insert error", insertQuestionsError)
      throw new Error("Database error")
    }
  }

  return await loadQuestions(challenge.id)
}

export async function GET(req: Request) {
  try {
    const user = await requireUser(req)

    const dateStr = utcDateString()
    const challenge = await getOrCreateDailyChallenge(dateStr)
    const questions = await ensureQuestions(challenge)

    const supabase = getSupabaseClient()
    const { data: attempt, error: attemptError } = await supabase
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

    if (attemptError) {
      if (isMissingDailyChallengeSchemaError(attemptError)) {
        throw new Error("DAILY_CHALLENGE_NOT_CONFIGURED")
      }
      console.error("daily_challenge_attempts select error", attemptError)
      throw new Error("Database error")
    }

    const responseQuestions = questions.map((q) => ({
      idx: q.idx,
      question: q.question,
      options: normalizeOptions(q.options),
      difficulty: q.difficulty,
      topic: q.topic,
    }))

    if (!attempt) {
      return NextResponse.json({
        date: dateStr,
        totalQuestions: responseQuestions.length,
        completed: false,
        questions: responseQuestions,
      })
    }

    const answersArray = Array.isArray(attempt.answers) ? attempt.answers.map((x) => String(x)) : []
    const solutions = questions.map((q) => ({
      idx: q.idx,
      answer: q.answer,
      explanation: q.explanation,
    }))

    return NextResponse.json({
      date: dateStr,
      totalQuestions: responseQuestions.length,
      completed: true,
      questions: responseQuestions,
      attempt: {
        answers: answersArray,
        score: attempt.score,
        totalQuestions: attempt.total_questions,
        xpEarned: attempt.xp_earned,
        completedAt: attempt.completed_at,
      },
      solutions,
    })
  } catch (err: any) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (err instanceof Error && err.message === "DAILY_CHALLENGE_NOT_CONFIGURED") {
      return NextResponse.json(
        {
          error: "Daily Challenge is not configured in Supabase yet.",
          hint: "Run supabase/setup.sql in Supabase SQL Editor to create daily_challenges tables and XP/streak columns.",
        },
        { status: 501 },
      )
    }
    if (err instanceof Error && err.message === "GROQ_NOT_CONFIGURED") {
      return NextResponse.json(
        { error: "Daily Challenge generation is not configured. Please set GROQ_API_KEY." },
        { status: 500 },
      )
    }
    console.error("DAILY_CHALLENGE_TODAY error", err)
    return NextResponse.json({ error: "Server error" }, { status: 500 })
  }
}
