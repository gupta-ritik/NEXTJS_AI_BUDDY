import { Suspense } from "react"
import RegisterClient from "./RegisterClient"

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-screen flex items-center justify-center px-4"
          style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
        >
          <div className="max-w-5xl w-full">
            <div className="card-soft rounded-3xl border border-slate-800 bg-slate-950/80 backdrop-blur-xl p-8 shadow-2xl">
              <div className="text-sm text-slate-300">Loading…</div>
            </div>
          </div>
        </div>
      }
    >
      <RegisterClient />
    </Suspense>
  )
}
