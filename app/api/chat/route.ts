import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import jwt from "jsonwebtoken"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

type ChatMessage = {
  role: "user" | "assistant" | "system"
  content: string
}

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get("authorization") || req.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const token = authHeader.slice("Bearer ".length)
    try {
      const secret = process.env.JWT_SECRET || "dev-secret"
      jwt.verify(token, secret)
    } catch {
      return NextResponse.json({ error: "Invalid or expired token" }, { status: 401 })
    }

    const body = await req.json()
    const messagesInput = (body?.messages || []) as ChatMessage[]
    const rawContext = typeof body?.context === "string" ? (body.context as string) : null

    if (!Array.isArray(messagesInput) || messagesInput.length === 0) {
      return NextResponse.json({ error: "messages array is required" }, { status: 400 })
    }

    const trimmedContext = rawContext ? rawContext.replace(/\s+/g, " ").slice(0, 7000) : ""

    const baseSystem =
      "You are AI Study Buddy, a friendly study assistant. Answer clearly and concisely, focusing on helping the student understand and remember concepts. Keep answers focused and avoid very long essays."

    const contextInstruction = trimmedContext
      ? "\n\nHere is syllabus or study context from the students latest summary. Use it only when it is relevant to the question, and do not repeat it verbatim.\n" +
        trimmedContext
      : ""

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: baseSystem + contextInstruction,
      },
      ...messagesInput.map((m): ChatMessage => ({
        role: m.role === "assistant" || m.role === "system" ? m.role : "user",
        content: String(m.content || ""),
      })),
    ]

    const completion = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages,
      temperature: 0.5,
    })

    const reply =
      (completion.choices[0]?.message?.content || "").trim() ||
      "Sorry, I couldn't generate a response."

    return NextResponse.json({ reply })
  } catch (err) {
    console.error("Chat error", err)
    return NextResponse.json({ error: "Chat failed" }, { status: 500 })
  }
}
