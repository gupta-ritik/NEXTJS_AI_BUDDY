import "./globals.css"
import type { Metadata, Viewport } from "next"
import MouseGlow from "./MouseGlow"
import PhysicsButtons from "./PhysicsButtons"
import ScrollReveal from "./ScrollReveal"
import TextScramble from "./TextScramble"
import AnimatedSvgLines from "./AnimatedSvgLines"
import ChatWidget from "./ChatWidget"
import Navbar from "./Navbar"
import Footer from "./Footer"

export const metadata: Metadata = {
  title: "AI Study Buddy - Your AI-powered study companion",
  description: "Transform your study routine with AI-powered tools. Create summaries, generate quizzes, predict exam topics, and track progress.",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "32x32" }
    ],
  },
}

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <MouseGlow />
        <PhysicsButtons />
        <ScrollReveal />
        <TextScramble />
        <AnimatedSvgLines />
        <ChatWidget />
        <Navbar />
        <main className="min-h-screen">{children}</main>
        <Footer />
      </body>
    </html>
  )
}
