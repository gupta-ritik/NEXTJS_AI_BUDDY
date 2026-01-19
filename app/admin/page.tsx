"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"

type MeResponse = {
  email?: string
  role?: "free" | "pro" | "admin"
  credits?: number
  error?: string
}

type AdminUserRow = {
  id: string
  email: string
  role: "free" | "pro" | "admin"
  credits: number
  referral_code?: string | null
  referred_by?: string | null
  created_at?: string | null
  provider?: string | null
  verified?: boolean | null
}

type UsersListResponse = {
  users?: AdminUserRow[]
  total?: number | null
  limit?: number
  offset?: number
  nextOffset?: number | null
  prevOffset?: number | null
  error?: string
}

function getToken(): string | null {
  if (typeof window === "undefined") return null
  try {
    return window.localStorage.getItem("token")
  } catch {
    return null
  }
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [me, setMe] = useState<MeResponse | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Role management form
  const [targetEmail, setTargetEmail] = useState("")
  const [targetRole, setTargetRole] = useState<"free" | "pro" | "admin">("free")
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  // Credits management
  const [creditEmail, setCreditEmail] = useState("")
  const [creditDelta, setCreditDelta] = useState("10")
  const [creditSaving, setCreditSaving] = useState(false)
  const [creditStatus, setCreditStatus] = useState<string | null>(null)

  // Users list
  const [usersLoading, setUsersLoading] = useState(false)
  const [usersError, setUsersError] = useState<string | null>(null)
  const [users, setUsers] = useState<AdminUserRow[]>([])
  const [q, setQ] = useState("")
  const [offset, setOffset] = useState(0)
  const [limit] = useState(25)
  const [total, setTotal] = useState<number | null>(null)

  const isAdmin = useMemo(() => me?.role === "admin", [me?.role])

  useEffect(() => {
    const token = getToken()
    if (!token) {
      router.push("/login")
      return
    }

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch("/api/auth/me", {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        })
        const body = (await res.json().catch(() => ({}))) as MeResponse
        if (!res.ok) {
          if (res.status === 401) {
            router.push("/login")
            return
          }
          if (res.status === 403) {
            throw new Error("Forbidden")
          }
          throw new Error(body.error || "Failed to load account")
        }
        setMe(body)
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong")
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  const loadUsers = async (nextOffset?: number) => {
    setUsersLoading(true)
    setUsersError(null)
    setCreditStatus(null)
    setStatus(null)

    const token = getToken()
    if (!token) {
      setUsersLoading(false)
      setUsersError("You are not logged in.")
      return
    }

    const useOffset = typeof nextOffset === "number" ? nextOffset : offset

    try {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      params.set("limit", String(limit))
      params.set("offset", String(useOffset))

      const res = await fetch(`/api/admin/users/list?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
        cache: "no-store",
      })
      const body = (await res.json().catch(() => ({}))) as UsersListResponse
      if (!res.ok) {
        throw new Error(body.error || "Failed to load users")
      }

      setUsers(Array.isArray(body.users) ? body.users : [])
      setTotal(typeof body.total === "number" ? body.total : null)
      setOffset(typeof body.offset === "number" ? body.offset : useOffset)
    } catch (e) {
      setUsersError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setUsersLoading(false)
    }
  }

  const setRole = async () => {
    setStatus(null)
    setSaving(true)
    setError(null)

    const token = getToken()
    if (!token) {
      setSaving(false)
      setError("You are not logged in.")
      return
    }

    try {
      const res = await fetch("/api/admin/users/role", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email: targetEmail.trim(), role: targetRole }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean }
      if (!res.ok) {
        throw new Error(body.error || "Failed to update role")
      }
      setStatus(`Updated ${targetEmail.trim()} to ${targetRole}`)
      // Refresh list if loaded
      if (users.length > 0) {
        await loadUsers(offset)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setSaving(false)
    }
  }

  const adjustCredits = async () => {
    setCreditStatus(null)
    setCreditSaving(true)
    setError(null)

    const token = getToken()
    if (!token) {
      setCreditSaving(false)
      setError("You are not logged in.")
      return
    }

    const email = creditEmail.trim()
    const delta = Number(creditDelta)
    if (!email) {
      setCreditSaving(false)
      setError("Email is required")
      return
    }
    if (!Number.isFinite(delta) || Math.trunc(delta) !== delta) {
      setCreditSaving(false)
      setError("Delta must be an integer")
      return
    }

    try {
      const res = await fetch("/api/admin/users/credits", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email, delta }),
      })
      const body = (await res.json().catch(() => ({}))) as { error?: string; success?: boolean; credits?: number | null }
      if (!res.ok) {
        throw new Error(body.error || "Failed to adjust credits")
      }

      setCreditStatus(
        typeof body.credits === "number"
          ? `Updated ${email} credits → ${body.credits}`
          : `Adjusted ${email} credits by ${delta}`,
      )

      if (users.length > 0) {
        await loadUsers(offset)
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong")
    } finally {
      setCreditSaving(false)
    }
  }

  return (
    <main
      className="min-h-screen px-4 py-10 md:py-14 flex justify-center"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      <div className="w-full max-w-4xl space-y-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-end md:justify-between gap-3"
        >
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Admin</p>
            <h1 className="text-2xl md:text-3xl font-semibold tracking-tight text-slate-100">
              Admin Dashboard
            </h1>
            <p className="text-xs md:text-sm text-slate-400">
              Manage roles and verify your account status.
            </p>
          </div>
          <button
            type="button"
            onClick={() => router.push("/dashboard")}
            className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-xs font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition"
          >
            Back to Dashboard
          </button>
        </motion.div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 md:p-5 shadow-xl">
          {loading ? (
            <p className="text-sm text-slate-300">Loading…</p>
          ) : error ? (
            <p className="text-sm text-red-300">{error}</p>
          ) : !me ? (
            <p className="text-sm text-slate-300">No account loaded.</p>
          ) : !isAdmin ? (
            <div className="space-y-2">
              <p className="text-sm text-slate-200">
                You are logged in as <span className="font-semibold">{me.email}</span>.
              </p>
              <p className="text-sm text-amber-200">
                Access denied: your role is <span className="font-semibold">{me.role || "free"}</span>.
              </p>
              <p className="text-[11px] text-slate-400">
                If you want this account to be admin, set `ADMIN_EMAIL=ritik1262003@gmail.com` in your `.env.local`,
                then refresh.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2 text-[11px]">
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                  {me.email}
                </span>
                <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-red-200">
                  ADMIN
                </span>
                <span className="rounded-full border border-slate-800 bg-slate-950/40 px-3 py-1 text-slate-200">
                  Credits: {typeof me.credits === "number" ? me.credits : "—"}
                </span>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🛠️</span>
                  <h2 className="text-sm font-semibold text-slate-100">User Role Management</h2>
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr,220px,160px]">
                  <input
                    value={targetEmail}
                    onChange={(e) => setTargetEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <select
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value as any)}
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100"
                  >
                    <option value="free">free</option>
                    <option value="pro">pro</option>
                    <option value="admin">admin</option>
                  </select>
                  <button
                    type="button"
                    disabled={saving || !targetEmail.trim()}
                    onClick={setRole}
                    className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition disabled:opacity-60"
                  >
                    {saving ? "Saving…" : "Update role"}
                  </button>
                </div>

                {status && <p className="text-[11px] text-emerald-200">{status}</p>}
                {error && <p className="text-[11px] text-red-300">{error}</p>}

                <p className="text-[11px] text-slate-400">
                  Tip: to make your own account admin, set email to <span className="font-semibold">ritik1262003@gmail.com</span>
                  and role to <span className="font-semibold">admin</span>.
                </p>
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💳</span>
                  <h2 className="text-sm font-semibold text-slate-100">Adjust Credits</h2>
                </div>

                <div className="grid gap-2 md:grid-cols-[1fr,220px,160px]">
                  <input
                    value={creditEmail}
                    onChange={(e) => setCreditEmail(e.target.value)}
                    placeholder="user@example.com"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <input
                    value={creditDelta}
                    onChange={(e) => setCreditDelta(e.target.value)}
                    placeholder="10 (or -10)"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <button
                    type="button"
                    disabled={creditSaving || !creditEmail.trim()}
                    onClick={adjustCredits}
                    className="inline-flex items-center justify-center rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-500/30 hover:bg-emerald-400 transition disabled:opacity-60"
                  >
                    {creditSaving ? "Saving…" : "Apply"}
                  </button>
                </div>

                {creditStatus && <p className="text-[11px] text-emerald-200">{creditStatus}</p>}
              </div>

              <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">👥</span>
                    <h2 className="text-sm font-semibold text-slate-100">Users</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => loadUsers(0)}
                    disabled={usersLoading}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-100 border border-slate-700 hover:border-indigo-500 hover:text-indigo-100 transition disabled:opacity-60"
                  >
                    {usersLoading ? "Loading…" : "Load"}
                  </button>
                </div>

                <div className="flex flex-col md:flex-row gap-2 md:items-center">
                  <input
                    value={q}
                    onChange={(e) => setQ(e.target.value)}
                    placeholder="Search by email"
                    className="w-full rounded-xl border border-slate-700 bg-slate-950/60 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-500"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setOffset(0)
                        loadUsers(0)
                      }}
                      disabled={usersLoading}
                      className="inline-flex items-center justify-center rounded-xl bg-indigo-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 hover:bg-indigo-400 transition disabled:opacity-60"
                    >
                      Search
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setQ("")
                        setOffset(0)
                        loadUsers(0)
                      }}
                      disabled={usersLoading}
                      className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-4 py-2 text-sm font-medium text-slate-100 border border-slate-700 hover:border-slate-500 transition disabled:opacity-60"
                    >
                      Reset
                    </button>
                  </div>
                </div>

                {usersError && <p className="text-[11px] text-red-300">{usersError}</p>}
                {typeof total === "number" && (
                  <p className="text-[11px] text-slate-400">Total users: {total}</p>
                )}

                {users.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-800">
                    <table className="min-w-full text-left text-[11px]">
                      <thead className="bg-slate-950/50 text-slate-300">
                        <tr>
                          <th className="px-3 py-2 font-semibold">Email</th>
                          <th className="px-3 py-2 font-semibold">Role</th>
                          <th className="px-3 py-2 font-semibold">Credits</th>
                          <th className="px-3 py-2 font-semibold">Referral</th>
                          <th className="px-3 py-2 font-semibold">Verified</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {users.map((u) => (
                          <tr key={u.id} className="text-slate-200">
                            <td className="px-3 py-2 whitespace-nowrap">{u.email}</td>
                            <td className="px-3 py-2">{u.role}</td>
                            <td className="px-3 py-2">{u.credits}</td>
                            <td className="px-3 py-2">{u.referral_code || "—"}</td>
                            <td className="px-3 py-2">{u.verified ? "yes" : "no"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400">No users loaded yet.</p>
                )}

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    disabled={usersLoading || offset <= 0}
                    onClick={() => {
                      const prev = Math.max(0, offset - limit)
                      setOffset(prev)
                      loadUsers(prev)
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-100 border border-slate-700 hover:border-slate-500 transition disabled:opacity-60"
                  >
                    Prev
                  </button>
                  <span className="text-[11px] text-slate-500">Offset: {offset}</span>
                  <button
                    type="button"
                    disabled={usersLoading || users.length < limit}
                    onClick={() => {
                      const next = offset + limit
                      setOffset(next)
                      loadUsers(next)
                    }}
                    className="inline-flex items-center justify-center rounded-xl bg-slate-950/60 px-3 py-1.5 text-[11px] font-medium text-slate-100 border border-slate-700 hover:border-slate-500 transition disabled:opacity-60"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
