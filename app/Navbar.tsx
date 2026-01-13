"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useRef, MouseEvent } from "react"
import ThemeToggle from "./ThemeToggle"

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/dashboard", label: "Dashboard" },
  { href: "/study-planner", label: "Study Planner" },
  { href: "/summarize", label: "Smart Notes" },
  { href: "/quiz-battle", label: "AI Quiz Battle" },
  { href: "/exam-predictor", label: "Exam Predictor" },
]

export default function Navbar() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const navRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    const nav = navRef.current
    if (!nav) return
    
    const rect = nav.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    
    nav.style.setProperty('--mouse-x', `${x}px`)
    nav.style.setProperty('--mouse-y', `${y}px`)
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-900/80 bg-slate-950/80 backdrop-blur-xl overflow-hidden">
      <nav 
        ref={navRef}
        onMouseMove={handleMouseMove}
        className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 text-xs md:text-sm relative
        before:absolute before:inset-0 before:bg-gradient-radial before:from-indigo-500/10 before:via-transparent before:to-transparent 
        before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100
        before:bg-[radial-gradient(200px_circle_at_var(--mouse-x,0)_var(--mouse-y,0),rgba(99,102,241,0.1),transparent_70%)]"
      >
        <Link href="/" className="flex items-center gap-2 group transition-transform duration-200 hover:scale-105">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/30 text-lg transition-all duration-200 group-hover:bg-indigo-500/50 group-hover:rotate-12">
            🎓
          </span>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-semibold tracking-tight text-slate-100 md:text-base">
              AI Study Buddy
            </span>
            <span className="text-[10px] text-slate-400 md:text-[11px]">
              Your AI friend for exams
            </span>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1 rounded-full border border-slate-800 bg-slate-900/60 px-2 py-0.5 transition-all duration-300 hover:border-indigo-500/50 hover:bg-slate-900/80">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={`rounded-full px-3 py-1 text-[11px] font-medium transition-all duration-200 relative overflow-hidden group/link ${
                      isActive
                        ? "bg-indigo-500 text-slate-50 shadow-sm shadow-indigo-500/40"
                        : "text-slate-300 hover:text-slate-50 hover:bg-slate-800/50 hover:scale-105"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="rounded-full border border-slate-700 bg-slate-900/70 px-3 py-1 text-[11px] font-medium text-slate-100 transition-all duration-200 hover:border-indigo-400 hover:text-indigo-200 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/20"
              >
                Log in
              </Link>
              <Link
                href="/register"
                className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-400 px-3.5 py-1.5 text-[11px] font-semibold text-white shadow-md shadow-indigo-500/50 transition-all duration-200 hover:brightness-110 hover:scale-105 hover:shadow-lg hover:shadow-indigo-500/60 active:scale-95"
              >
                Start studying
              </Link>
              <ThemeToggle />
            </div>
          </div>

          {/* Mobile hamburger */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-900/80 text-slate-100 text-xs transition-all duration-200 hover:border-indigo-400 hover:bg-slate-800 hover:scale-110 active:scale-95"
              aria-label="Toggle navigation menu"
            >
              {open ? "✕" : "☰"}
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile nav sheet */}
      {open && (
        <div className="border-t border-slate-900/80 bg-slate-950/95 px-4 pb-4 pt-2 text-[11px] text-slate-200 md:hidden">
          <div className="mx-auto flex max-w-6xl flex-col gap-3">
            <div className="flex flex-wrap gap-2">
              {navLinks.map((link) => {
                const isActive =
                  pathname === link.href || (link.href !== "/" && pathname.startsWith(link.href))
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className={`rounded-full px-3 py-1 font-medium transition-all duration-200 ${
                      isActive
                        ? "bg-indigo-500 text-slate-50 shadow-sm shadow-indigo-500/40"
                        : "bg-slate-900/80 text-slate-200 hover:text-slate-50 hover:bg-slate-800 hover:scale-105"
                    }`}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            <div className="flex flex-wrap gap-2 items-center">
              <Link
                href="/login"
                onClick={() => setOpen(false)}
                className="rounded-full border border-slate-700 bg-slate-900/80 px-3 py-1 font-medium text-slate-100 transition-all duration-200 hover:border-indigo-400 hover:text-indigo-200 hover:scale-105"
              >
                Log in
              </Link>
              <Link
                href="/register"
                onClick={() => setOpen(false)}
                className="rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-fuchsia-400 px-3.5 py-1.5 font-semibold text-white shadow-md shadow-indigo-500/50 transition-all duration-200 hover:brightness-110 hover:scale-105 active:scale-95"
              >
                Start studying
              </Link>
              <div className="ml-auto">
                <ThemeToggle />
              </div>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
