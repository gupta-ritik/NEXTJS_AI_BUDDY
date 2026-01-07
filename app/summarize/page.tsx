"use client"
import { useState } from "react"

export default function SummarizePage() {
  const [text, setText] = useState("")
  const [summary, setSummary] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSummarize = async () => {
    setLoading(true)

    const res = await fetch("/api/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    })

    const data = await res.json()
    setSummary(data.summary)
    setLoading(false)
  }

  return (
    <div style={{ maxWidth: 700, margin: "40px auto" }}>
      <h2>✍️ Text Summarizer</h2>

      <textarea
        rows={8}
        style={{ width: "100%", marginTop: 10 }}
        placeholder="Paste text here..."
        onChange={(e) => setText(e.target.value)}
      />

      <button
        onClick={handleSummarize}
        style={{ marginTop: 10 }}
      >
        {loading ? "Summarizing..." : "Summarize"}
      </button>

      {summary && (
        <div style={{ marginTop: 20 }}>
          <h3>📌 Summary</h3>
          <p>{summary}</p>
        </div>
      )}
    </div>
  )
}
