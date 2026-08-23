"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Sparkles, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/login", { email, password });
      loginStore(response.data.token, response.data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Invalid email or password");
    } finally {
      setLoading(false);
    }
  };

  // Simulates google login callback
  const handleGoogleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      const response = await api.post("/auth/google", {
        email: email || "sandbox_user@gmail.com",
        name: "Sandbox Google Account",
        token: "mock_google_oauth_token_12345"
      });
      loginStore(response.data.token, response.data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Google authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md bg-white border border-[#e8e8ed] rounded-3xl p-8 shadow-sm">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-black text-white p-3 rounded-2xl mb-4">
          <Sparkles className="w-6 h-6 text-emerald-400" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="text-sm text-apple-gray-300 mt-1">Manage your financial timeline elegantly</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-apple-gray-300 mb-2">Email Address</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black transition-all bg-[#f5f5f7]/50"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-apple-gray-300 mb-2">Password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            placeholder="••••••••"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black transition-all bg-[#f5f5f7]/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "Authenticating..." : "Sign In"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <div className="relative flex items-center justify-center my-6">
        <div className="border-t border-[#e8e8ed] w-full absolute"></div>
        <span className="bg-white px-3 text-xs uppercase text-apple-gray-300 relative z-10">Or connect</span>
      </div>

      <button
        onClick={handleGoogleLogin}
        disabled={loading}
        className="w-full border border-[#e8e8ed] py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-[#f5f5f7] active:scale-95 transition-all mb-6 text-apple-gray-400"
      >
        <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
          <path fill="#EA4335" d="M12 5.04c1.73 0 3.3.6 4.52 1.76l3.38-3.38C17.85 1.54 15.11 1 12 1 7.35 1 3.39 3.65 1.52 7.54l3.86 3C6.31 7.54 8.94 5.04 12 5.04z" />
          <path fill="#4285F4" d="M23.49 12.27c0-.82-.07-1.61-.21-2.38H12v4.51h6.44c-.28 1.48-1.11 2.73-2.37 3.58v2.98h3.84c2.24-2.06 3.58-5.1 3.58-8.69z" />
          <path fill="#FBBC05" d="M5.38 14.54c-.24-.73-.38-1.52-.38-2.34s.14-1.61.38-2.34L1.52 6.86C.55 8.81 0 10.96 0 13.2s.55 4.39 1.52 6.34l3.86-3z" />
          <path fill="#34A853" d="M12 23c3.24 0 5.97-1.07 7.96-2.91l-3.84-2.98c-1.07.72-2.44 1.15-4.12 1.15-3.06 0-5.69-2.5-6.62-5.5l-3.86 3C3.39 19.54 7.35 23 12 23z" />
        </svg>
        Sign In with Google
      </button>

      <p className="text-center text-xs text-apple-gray-300">
        Don't have an account?{" "}
        <Link href="/register" className="text-black font-semibold hover:underline">
          Create account
        </Link>
      </p>
    </div>
  );
}
