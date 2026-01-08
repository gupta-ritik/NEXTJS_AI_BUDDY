import { NextResponse } from "next/server"
import type pdfParseType from "pdf-parse/lib/pdf-parse.js"

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get("file") as File

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())

    // Dynamically import the core pdf-parse implementation to avoid running its CLI self-test
    const pdfModule = (await import("pdf-parse/lib/pdf-parse.js")) as { default: typeof pdfParseType } | typeof pdfParseType
    const pdfParse = (pdfModule as any).default || (pdfModule as any)

    const data = await pdfParse(buffer)

    return NextResponse.json({ text: data.text })
  } catch (err) {
    console.error("PDF parse error", err)
    return NextResponse.json(
      { error: "Failed to read PDF on the server." },
      { status: 500 }
    )
  }
}
