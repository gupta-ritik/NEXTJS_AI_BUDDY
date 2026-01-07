"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [show, setShow] = useState(false)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  // 🔐 Password strength logic
  const getStrength = () => {
    let score = 0
    if (password.length >= 8) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[^A-Za-z0-9]/.test(password)) score++
    return score
  }

  const strength = getStrength()
  const passwordsMatch = password && confirm && password === confirm
  const canSubmit = strength >= 3 && passwordsMatch

  const handleRegister = async () => {
    if (!canSubmit) return

    await fetch("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    })

    setSuccess(true)

    setTimeout(() => {
      router.push("/login")
    }, 1800)
  }

  return (
    <div className="min-h-screen flex items-center justify-center
      bg-gradient-to-br from-indigo-600 to-purple-700 px-4">

      <AnimatePresence>
        {!success && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.4 }}
            className="w-full max-w-md bg-white
            rounded-2xl shadow-xl p-8"
          >
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              📝 Create Account
            </h2>

            <p className="text-sm text-gray-500 mb-6">
              Join Study Buddy and start learning smarter 🚀
            </p>

            {/* Email */}
            <label className="text-sm font-medium text-gray-700">Email</label>
            <input
              type="email"
              placeholder="you@example.com"
              className="mt-1 mb-4 w-full rounded-lg border px-4 py-2
                border-gray-300 focus:ring-2 focus:ring-indigo-500"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            {/* Password + Tooltip */}
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              Password
              <span className="relative group cursor-pointer">
                ℹ️
                <div className="absolute left-0 top-6 z-10 hidden group-hover:block
                  w-64 text-xs bg-black text-white p-3 rounded-lg">
                  Password must contain:
                  <ul className="list-disc ml-4 mt-1">
                    <li>At least 8 characters</li>
                    <li>1 uppercase letter</li>
                    <li>1 number</li>
                    <li>1 special character</li>
                  </ul>
                </div>
              </span>
            </label>

            <div className="relative">
              <input
                type={show ? "text" : "password"}
                placeholder="••••••••"
                className="mt-1 w-full rounded-lg border px-4 py-2 pr-12
                  border-gray-300 focus:ring-2 focus:ring-indigo-500"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-4 text-sm text-indigo-600"
              >
                {show ? "Hide" : "Show"}
              </button>
            </div>

            {/* Strength Bar */}
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className={`h-2 w-full rounded
                      ${strength >= i
                        ? strength <= 1
                          ? "bg-red-500"
                          : strength === 2
                          ? "bg-yellow-400"
                          : strength === 3
                          ? "bg-blue-500"
                          : "bg-green-500"
                        : "bg-gray-200"}`}
                  />
                ))}
              </div>
              <p className="text-xs mt-1 text-gray-500">
                {strength <= 1 && "Weak"}
                {strength === 2 && "Medium"}
                {strength === 3 && "Strong"}
                {strength === 4 && "Very Strong"}
              </p>
            </div>

            {/* Confirm Password + Match Tick */}
            <label className="text-sm font-medium text-gray-700 mt-4 block">
              Confirm Password
            </label>

            <div className="relative">
              <input
                type="password"
                placeholder="••••••••"
                className={`mt-1 w-full rounded-lg border px-4 py-2 pr-10
                  focus:ring-2
                  ${confirm
                    ? passwordsMatch
                      ? "border-green-500 focus:ring-green-500"
                      : "border-red-500 focus:ring-red-500"
                    : "border-gray-300 focus:ring-indigo-500"}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />

              {confirm && (
                <span className="absolute right-3 top-4">
                  {passwordsMatch ? "✅" : "❌"}
                </span>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={handleRegister}
              disabled={!canSubmit}
              className={`mt-6 w-full rounded-lg py-2 font-semibold transition
                ${canSubmit
                  ? "bg-indigo-600 text-white hover:bg-indigo-700"
                  : "bg-gray-300 text-gray-600 cursor-not-allowed"}`}
            >
              Create Account
            </button>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{" "}
              <a href="/login" className="text-indigo-600 font-semibold hover:underline">
                Login
              </a>
            </p>
          </motion.div>
        )}

        {/* ✅ SUCCESS ANIMATION */}
        {success && (
          <motion.div
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white rounded-2xl p-10 text-center shadow-xl"
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
              className="text-6xl"
            >
              🎉
            </motion.div>
            <h2 className="text-2xl font-bold mt-4">Account Created!</h2>
            <p className="text-gray-500 mt-2">
              Redirecting to login...
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
