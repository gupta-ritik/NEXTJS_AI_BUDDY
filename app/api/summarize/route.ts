import { NextResponse } from "next/server"
import Groq from "groq-sdk"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(req: Request) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "Text is required" }, { status: 400 })
    }

    const chat = await groq.chat.completions.create({
      model: "llama-3.1-8b-instant",
      messages: [
        { role: "system", content: "Summarize clearly for a student." },
        { role: "user", content: text },
      ],
    })

    return NextResponse.json({
      summary: chat.choices[0].message.content,
    })
  } catch (err) {
    return NextResponse.json(
      { error: "Summarization failed" },
      { status: 500 }
    )
  }
}
