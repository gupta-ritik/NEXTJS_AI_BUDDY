import { NextResponse } from "next/server"

function isYouTubeUrl(url: string) {
  return url.includes("youtube.com") || url.includes("youtu.be")
}

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "URL is required" }, { status: 400 })
    }

    if (!url.startsWith("http://") && !url.startsWith("https://")) {
      return NextResponse.json({ error: "URL must start with http or https" }, { status: 400 })
    }

    // Handle YouTube specially, similar to the Streamlit app
    if (isYouTubeUrl(url)) {
      const oembedRes = await fetch(
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
      )

      if (!oembedRes.ok) {
        return NextResponse.json(
          { error: "Could not fetch YouTube metadata" },
          { status: 400 }
        )
      }

      const data = await oembedRes.json()
      const title = (data as any).title ?? "YouTube video"
      const text = `Topic: ${title}. Explain clearly with examples.`

      return NextResponse.json({ text })
    }

    // Generic website: fetch HTML and strip tags into plain text
    const pageRes = await fetch(url, { cache: "no-store" })

    if (!pageRes.ok) {
      return NextResponse.json(
        { error: "Could not load content from URL" },
        { status: 400 }
      )
    }

    const html = await pageRes.text()

    // Very simple HTML -> text cleanup
    const withoutScripts = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, " ")

    const text = withoutScripts
      .replace(/<[^>]+>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/\s+/g, " ")
      .trim()

    if (!text) {
      return NextResponse.json(
        { error: "No readable text found on page" },
        { status: 400 }
      )
    }

    return NextResponse.json({ text })
  } catch (err) {
    console.error("Content load error", err)
    return NextResponse.json(
      { error: "Failed to load content from URL" },
      { status: 500 }
    )
  }
}
