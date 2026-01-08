"use client"

import { useEffect } from "react"
import { gsap } from "gsap"
import { Physics2DPlugin } from "gsap/Physics2DPlugin"

export default function PhysicsButtons() {
  useEffect(() => {
    if (typeof window === "undefined") return

    gsap.registerPlugin(Physics2DPlugin)

    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement | HTMLAnchorElement>(
        ".physics-button"
      )
    )

    const handlers: Array<() => void> = []

    buttons.forEach((btn) => {
      const tl = gsap.timeline({ paused: true })

      tl.to(btn, {
        duration: 0.6,
        physics2D: {
          velocity: 350,
          angle: -90,
          gravity: 900,
        },
        yoyo: true,
        repeat: 1,
        ease: "none",
      })

      const handler = () => {
        tl.restart()
      }

      btn.addEventListener("pointerdown", handler)
      handlers.push(() => btn.removeEventListener("pointerdown", handler))
    })

    return () => {
      handlers.forEach((off) => off())
    }
  }, [])

  return null
}
