"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"
import { ScrambleTextPlugin } from "gsap/ScrambleTextPlugin"

const heroBlocks = [
  "PDFs",
  "YouTube",
  "Exam notes",
  "Chat prompts",
]

const howItWorks = [
  {
    title: "PDF Summarizer",
    description: "Upload any PDF and get a clean, exam-ready summary in seconds.",
    icon: "📄",
  },
  {
    title: "YouTube Summarizer",
    description: "Paste a lecture link and turn it into notes, MCQs, and flashcards.",
    icon: "▶️",
  },
  {
    title: "AI Exam Notes",
    description: "Turn textbook chapters into focused revision sheets with examples.",
    icon: "🎓",
  },
  {
    title: "Chat with Notes",
    description: "Ask questions on top of your notes and get simple answers.",
    icon: "💬",
  },
]

const summaryTypes = [
  {
    label: "PDF AI Summary",
    icon: "📑",
  },
  {
    label: "YouTube Video Summary",
    icon: "📺",
  },
  {
    label: "AI Exam Notes",
    icon: "📝",
  },
]

export default function Home() {
  const heroRef = useRef<HTMLDivElement | null>(null)
  const buttonRef = useRef<HTMLAnchorElement | null>(null)
  const cardRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!heroRef.current) return

    gsap.registerPlugin(ScrambleTextPlugin)

    const ctx = gsap.context(() => {
      gsap.from(".hero-badge", {
        y: -12,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
      })

      gsap.from(".hero-title-line", {
        y: 40,
        opacity: 0,
        duration: 0.7,
        ease: "power3.out",
        stagger: 0.12,
        delay: 0.1,
      })

      gsap.to(".hero-scramble", {
        duration: 2.5,
        scrambleText: {
          text: "AI-powered smart notes.",
          chars: "upperAndLowerCase",
          revealDelay: 0.2,
          speed: 0.3,
        },
        delay: 0.7,
        ease: "none",
      })

      gsap.from(".hero-copy", {
        y: 20,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.3,
      })

      gsap.from(".hero-cta-wrapper", {
        y: 18,
        opacity: 0,
        duration: 0.6,
        ease: "power3.out",
        delay: 0.4,
      })

      if (buttonRef.current) {
        gsap.to(buttonRef.current, {
          scale: 1.04,
          y: -4,
          duration: 1.4,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        })
      }

      if (cardRef.current) {
        gsap.from(cardRef.current, {
          y: 40,
          opacity: 0,
          duration: 0.8,
          ease: "power3.out",
          delay: 0.4,
        })

        gsap.to(cardRef.current, {
          y: -10,
          duration: 3,
          ease: "sine.inOut",
          yoyo: true,
          repeat: -1,
        })
      }

      gsap.to(".floating-pill", {
        y: -12,
        duration: 2.6,
        ease: "sine.inOut",
        yoyo: true,
        repeat: -1,
        stagger: 0.3,
      })
    }, heroRef)

    return () => ctx.revert()
  }, [])

  return (
    <main
      className="relative min-h-screen w-full overflow-hidden"
      style={{ backgroundColor: "var(--background)", color: "var(--foreground)" }}
    >
      {/* galaxy background glows */}
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute -left-40 top-10 h-72 w-72 rounded-full bg-fuchsia-500/25 blur-3xl" />
        <div className="absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl" />
        <div className="absolute right-[-6rem] top-32 h-72 w-72 rounded-full bg-sky-500/25 blur-3xl" />
        <div className="absolute left-1/3 bottom-[-6rem] h-72 w-72 rounded-full bg-purple-500/30 blur-3xl" />
      </div>

      {/* HERO */}
      <section
        ref={heroRef}
        className="relative mx-auto flex max-w-6xl flex-col gap-12 px-4 pb-20 pt-20 md:flex-row md:items-center md:pb-28 md:pt-24"
      >
        <div className="relative z-10 flex-1 space-y-6 md:space-y-8">
          <div className="hero-badge inline-flex items-center gap-2 rounded-full border border-indigo-400/60 bg-indigo-500/10 px-3 py-1 text-[11px] text-indigo-100 shadow-[0_0_24px_rgba(129,140,248,0.4)]">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            <span>Study Buddy · AI powered</span>
          </div>

          <h1 className="text-4xl font-semibold tracking-tight md:text-5xl lg:text-6xl">
            <span className="hero-title-line block">Study smarter,</span>
            <span className="hero-title-line hero-scramble block bg-gradient-to-r from-indigo-300 via-sky-300 to-fuchsia-300 bg-clip-text text-transparent">
              not harder.
            </span>
          </h1>

          <p className="hero-copy max-w-xl text-sm text-slate-300 md:text-base">
            AI summaries, notes, and study plans tailored to you from PDFs, YouTube videos, and raw topics—so you can revise
            faster and remember more.
          </p>

          <div className="hero-cta-wrapper flex flex-col gap-3 pt-1 sm:flex-row sm:items-center">
            <a
              href="/login"
              ref={buttonRef}
              className="physics-button inline-flex items-center justify-center rounded-full bg-indigo-500 px-7 py-2.5 text-sm font-medium text-white shadow-[0_0_32px_rgba(99,102,241,0.7)] transition hover:bg-indigo-400"
            >
              Get started
            </a>
            <a
              href="/summarize"
              className="inline-flex items-center justify-center rounded-full border border-slate-600/80 bg-slate-900/60 px-6 py-2.5 text-sm font-medium text-slate-100 backdrop-blur hover:border-indigo-400/80 hover:text-indigo-100"
            >
              Try demo
            </a>
          </div>

          <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-400 md:text-sm">
            <div className="flex flex-col">
              <span className="text-slate-200">Fast summaries</span>
              <span>Turn long PDFs into key insights in seconds.</span>
            </div>
            <div className="h-10 w-px bg-slate-800/70" />
            <div className="flex flex-col">
              <span className="text-slate-200">Focus mode</span>
              <span>Stay on track with MCQs and flashcards.</span>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-slate-400">
            {heroBlocks.map((b) => (
              <span
                key={b}
                className="floating-pill inline-flex items-center gap-1 rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-200"
              >
                <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                {b}
              </span>
            ))}
          </div>
        </div>

        {/* glass hero card */}
        <div className="relative z-10 flex-1">
          <div
            ref={cardRef}
            className="mx-auto max-w-md rounded-3xl border border-indigo-400/40 bg-slate-900/70 p-4 shadow-[0_0_80px_rgba(129,140,248,0.7)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-center justify-between text-[11px] text-slate-400">
              <span className="inline-flex items-center gap-1 rounded-full bg-slate-900/80 px-3 py-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                Live study pack
              </span>
              <span className="rounded-full border border-slate-700/70 bg-slate-900/80 px-2 py-0.5 text-[10px]">
                AI generated
              </span>
            </div>

            <div className="space-y-3 rounded-2xl border border-slate-800 bg-slate-950/80 p-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span className="inline-flex items-center gap-2">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-indigo-500/20 text-indigo-200">
                    📘
                  </span>
                  <span>
                    Thermodynamics – <span className="text-indigo-300">Lecture 4</span>
                  </span>
                </span>
                <span className="text-[10px] text-slate-500">Summary · MCQs · Mind map</span>
              </div>

              <div className="mt-2 grid grid-cols-[1.2fr,0.9fr] gap-3 text-[11px] text-slate-200">
                <div className="space-y-1 rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5">
                  <p className="mb-1 text-xs font-semibold text-slate-100">Key takeaways</p>
                  <ul className="space-y-0.5 text-[11px] text-slate-300">
                    <li>• First law links internal energy, heat, and work.</li>
                    <li>• Closed vs open systems in real exam problems.</li>
                    <li>• Common traps your teacher loves to ask.</li>
                  </ul>
                </div>
                <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-2.5">
                  <p className="text-xs font-semibold text-slate-100">Practice MCQ</p>
                  <div className="space-y-1">
                    <button className="w-full rounded-xl border border-slate-700 bg-slate-950/70 px-2 py-1.5 text-left text-[11px] text-slate-200 hover:border-emerald-500/70">
                      Heat added at constant volume mainly changes…
                    </button>
                    <div className="flex items-center justify-between text-[10px] text-slate-500">
                      <span>Tap to reveal answer</span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-emerald-300">
                        12 cards
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                <span className="inline-flex items-center gap-1 text-slate-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-sky-400" />
                  Saved to dashboard
                </span>
                <div className="flex gap-1.5">
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-300">Summary</span>
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-300">Flashcards</span>
                  <span className="rounded-full bg-slate-900/80 px-2 py-0.5 text-slate-300">Mind map</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20">
        <div className="scroll-reveal text-center space-y-3">
          <p className="text-xs uppercase tracking-[0.25em] text-slate-400">How it works</p>
          <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
            Upload content in, <span className="text-indigo-300">study pack</span> out.
          </h2>
          <p className="mx-auto max-w-2xl text-xs text-slate-400 md:text-sm">
            Drop in a PDF, YouTube lecture, or raw topic. We clean it up into notes, MCQs, flashcards, and a mind map you can
            revise from in minutes.
          </p>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-4">
          {howItWorks.map((item) => (
            <div
              key={item.title}
              className="scroll-reveal rounded-2xl border border-slate-800 bg-slate-950/70 p-4 shadow-[0_0_40px_rgba(15,23,42,0.9)] backdrop-blur"
            >
              <div className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-500/20 text-lg">
                {item.icon}
              </div>
              <h3 className="mb-1 text-sm font-semibold text-slate-50">{item.title}</h3>
              <p className="text-[11px] text-slate-400 leading-relaxed">{item.description}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-3">
          <div className="scroll-reveal space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left text-sm">
            <p className="text-xs font-semibold text-indigo-300">1. Upload content</p>
            <p className="text-[11px] text-slate-400">
              Add any PDF, YouTube video, or topic. We handle messy formatting so you don&apos;t have to.
            </p>
          </div>
          <div className="scroll-reveal space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left text-sm">
            <p className="text-xs font-semibold text-indigo-300">2. We build the pack</p>
            <p className="text-[11px] text-slate-400">
              Behind the scenes, the AI creates a summary, keywords, MCQs, flashcards, and a mind map.
            </p>
          </div>
          <div className="scroll-reveal space-y-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 text-left text-sm">
            <p className="text-xs font-semibold text-indigo-300">3. You start revising</p>
            <p className="text-[11px] text-slate-400">
              Quiz yourself, listen in podcast mode, or export to PPT/PDF and keep your streak on the dashboard.
            </p>
          </div>
        </div>
      </section>

      {/* SUMMARY TYPES STRIP */}
      <section className="relative mx-auto max-w-6xl px-4 pb-20">
        <div className="scroll-reveal rounded-3xl border border-slate-800 bg-slate-950/80 p-5 shadow-[0_0_60px_rgba(15,23,42,0.9)]">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-1">
              <h3 className="text-lg font-semibold text-slate-50">Get instant summaries for all your study needs.</h3>
              <p className="max-w-xl text-xs text-slate-400 md:text-sm">
                One workspace to keep summaries from PDFs, lectures, and exam notes together—with history and a planner so you
                never lose track.
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-xs">
              {summaryTypes.map((type) => (
                <span
                  key={type.label}
                  className="scroll-reveal inline-flex items-center gap-2 rounded-full border border-slate-700 bg-slate-900/90 px-3 py-1.5 text-slate-100"
                >
                  <span>{type.icon}</span>
                  {type.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  )
}
