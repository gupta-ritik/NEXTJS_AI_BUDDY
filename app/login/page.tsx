"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const router = useRouter()

  const handleLogin = async () => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    const data = await res.json()

    if (data.token) {
      alert("Login successful")
      router.push("/summarize")
    } else {
      alert(data.error || "Login failed")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-600 to-purple-700 px-4">
      
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        
        {/* Title */}
        <h2 className="text-2xl font-bold text-center text-gray-800">
          🔐 Welcome Back
        </h2>
        <p className="text-center text-gray-500 mt-1">
          Login to your Study Buddy account
        </p>

        {/* Email */}
        <div className="mt-6">
          <label className="text-sm font-medium text-gray-700">
            Email
          </label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="mt-1 w-full rounded-lg border px-4 py-2
              border-gray-300 focus:outline-none
              focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Password */}
        <div className="mt-4">
          <label className="text-sm font-medium text-gray-700">
            Password
          </label>
          <input
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="mt-1 w-full rounded-lg border px-4 py-2
              border-gray-300 focus:outline-none
              focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {/* Button */}
        <button
          onClick={handleLogin}
          className="mt-6 w-full rounded-lg bg-indigo-600
            text-white py-2 font-semibold
            hover:bg-indigo-700 transition"
        >
          Login
        </button>

        {/* Footer */}
        <p className="text-center text-sm text-gray-600 mt-4">
          No account?{" "}
          <a
            href="/register"
            className="text-indigo-600 font-semibold hover:underline"
          >
            Register
          </a>
        </p>

      </div>
    </div>
  )
}
