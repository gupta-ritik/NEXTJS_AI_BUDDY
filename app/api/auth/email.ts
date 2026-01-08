import nodemailer from "nodemailer"

export async function sendVerificationEmail(to: string, token: string) {
  const host = process.env.SMTP_HOST
  const port = process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587
  const user = process.env.SMTP_USER
  const pass = process.env.SMTP_PASS
  const from = process.env.SMTP_FROM || user

  if (!host || !user || !pass) {
    console.warn("SMTP credentials are not fully configured; skipping email send.")
    return
  }

  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    auth: { user, pass },
  })

  const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000"
  const verifyUrl = `${baseUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`

  const html = `
    <div style="font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; padding: 24px;">
      <h1 style="font-size: 20px; margin-bottom: 16px;">Verify your email for AI Study Buddy</h1>
      <p style="margin-bottom: 12px;">Thanks for signing up! Please confirm that this email belongs to you by clicking the button below.</p>
      <p style="margin-bottom: 20px;">
        <a href="${verifyUrl}" style="display: inline-block; padding: 10px 18px; background: #4f46e5; color: #ffffff; border-radius: 999px; text-decoration: none; font-weight: 600;">Verify email</a>
      </p>
      <p style="font-size: 13px; color: #6b7280;">If the button doesn&rsquo;t work, paste this link into your browser:</p>
      <p style="font-size: 13px; color: #4b5563; word-break: break-all;">${verifyUrl}</p>
    </div>
  `

  await transporter.sendMail({
    from,
    to,
    subject: "Verify your email for AI Study Buddy",
    html,
  })
}
