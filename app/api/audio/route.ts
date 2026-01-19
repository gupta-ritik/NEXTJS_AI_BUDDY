import { NextResponse } from "next/server"
import Groq from "groq-sdk"
import { authorizeAiCall } from "../auth/monetization"

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export async function POST(req: Request) {
  let rollback: (() => Promise<void>) | null = null
  try {
    const formData = await req.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No audio file uploaded" }, { status: 400 })
    }

    try {
      const auth = await authorizeAiCall(req)
      rollback = auth.rollback
    } catch (err: any) {
      if (err instanceof Error && err.message === "UNAUTHORIZED") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      if (err instanceof Error && err.message === "OUT_OF_CREDITS") {
        return NextResponse.json(
          { error: "Out of credits. Earn more by streaks, challenges, or referrals!" },
          { status: 402 }
        )
      }
      throw err
    }

    const transcription: any = await (groq as any).audio.transcriptions.create({
      file,
      model: "whisper-large-v3",
      response_format: "json",
    })

    const text: string = transcription?.text || ""

    if (!text.trim()) {
      if (rollback) {
        try {
          await rollback()
        } catch {}
        rollback = null
      }
      return NextResponse.json(
        { error: "Could not transcribe audio file" },
        { status: 500 }
      )
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error("Audio transcription error", err)
    if (rollback) {
      try {
        await rollback()
      } catch {}
    }
    return NextResponse.json(
      { error: "Failed to transcribe audio on the server." },
      { status: 500 }
    )
  }
}
