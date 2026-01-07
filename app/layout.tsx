import "./globals.css"

export const metadata = {
  title: "AI Study Buddy",
  description: "AI powered summarizer",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
