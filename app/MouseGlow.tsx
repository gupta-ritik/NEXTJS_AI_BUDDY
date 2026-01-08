"use client"

import { useEffect, useRef } from "react"
import { gsap } from "gsap"

export default function MouseGlow() {
  const cursorRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!cursorRef.current) return

    const el = cursorRef.current

    // start near the center
    gsap.set(el, { x: window.innerWidth / 2, y: window.innerHeight / 2 })

    const move = (e: PointerEvent) => {
      gsap.to(el, {
        x: e.clientX,
        y: e.clientY,
        duration: 0.25,
        ease: "power2.out",
      })
    }

    window.addEventListener("pointermove", move)

    return () => {
      window.removeEventListener("pointermove", move)
    }
  }, [])

  return (
    <div
      ref={cursorRef}
      className="pointer-events-none fixed z-40 h-16 w-16 -translate-x-1/2 -translate-y-1/2"
      aria-hidden
    >
      <div className="h-16 w-16 rounded-full bg-indigo-500/25 blur-3xl mix-blend-screen" />
      <div className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border border-indigo-300/80 bg-indigo-200/80 shadow-[0_0_12px_rgba(129,140,248,0.9)]" />
    </div>
  )
}
