"use client"

import { useMemo, useState } from "react"

type ReferralMeResponse = {
  code?: string
  shareUrl?: string
  error?: string
  hint?: string
}

function getTokenFromLocalStorage(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem("token")
  } catch {
    return null
  }
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "true")
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    textarea.style.top = "0"
    document.body.appendChild(textarea)
    textarea.select()
    textarea.setSelectionRange(0, textarea.value.length)
    const ok = document.execCommand("copy")
    document.body.removeChild(textarea)
    return ok
  } catch {
    return false
  }
}

export default function ReferralCard() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [code, setCode] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const canCopy = useMemo(() => Boolean(shareUrl), [shareUrl])

  const loadReferral = async () => {
    setLoading(true)
    setError(null)

    const token = getTokenFromLocalStorage()
    if (!token) {
      setLoading(false)
      setError("You are not logged in.")
      return
    }

    try {
      const res = await fetch("/api/referral/me", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        cache: "no-store",
      })

      const body = (await res.json().catch(() => ({}))) as ReferralMeResponse

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error("Unauthorized. Please log in again.")
        }
        if (res.status === 501) {
          throw new Error(
            body.hint ||
              "Referrals are not enabled in your Supabase database yet. Run the SQL in ARCHITECTURE.md.",
          )
        }
        throw new Error(body.error || "Failed to load referral details")
      }

      setCode(typeof body.code === "string" ? body.code : null)
      setShareUrl(typeof body.shareUrl === "string" ? body.shareUrl : null)
    } catch (e) {
      const message = e instanceof Error ? e.message : "Something went wrong"
      setError(message)
    } finally {
      setLoading(false)
    }
  }

  const onCopy = async () => {
    if (!shareUrl) return
    const ok = await copyToClipboard(shareUrl)
    setCopied(ok)
    if (ok) {
      window.setTimeout(() => setCopied(false), 1800)
    }
  }

  return (
    <section className="scroll-reveal relative rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-xl overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-tr from-fuchsia-500/10 via-indigo-500/5 to-emerald-500/10 opacity-40 pointer-events-none" />
      <div className="relative space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎁</span>
            <h2 className="text-sm md:text-base font-semibold">Referral Link</h2>
          </div>
        </div>

        <p className="text-[11px] md:text-sm text-slate-400 max-w-2xl">
          Share your link with friends. When they sign up using it, both of you can get bonus credits.
        </p>

        <div className="flex flex-col gap-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <button
              type="button"
              onClick={loadReferral}
              disabled={loading}
              className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition disabled:opacity-60"
            >
              {loading ? "Loading…" : code || shareUrl ? "Refresh link" : "Get my link"}
            </button>

            <button
              type="button"
              onClick={onCopy}
              disabled={!canCopy}
              className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition disabled:opacity-60"
            >
              {copied ? "Copied!" : "Copy link"}
            </button>
          </div>

          {shareUrl && (
            <div className="rounded-xl border border-slate-800 bg-slate-950/40 px-3 py-2">
              <p className="text-[10px] text-slate-500 mb-1">Your referral link</p>
              <p className="text-[11px] text-slate-200 break-all">{shareUrl}</p>
              {code && <p className="mt-1 text-[10px] text-slate-500">Code: {code}</p>}
            </div>
          )}

          {error && (
            <p className="text-[11px] text-red-300">
              {error}
            </p>
          )}
        </div>
      </div>
    </section>
  )
}
