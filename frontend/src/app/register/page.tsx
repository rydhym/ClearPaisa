"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import api from "@/lib/api";
import { Sparkles, ArrowRight } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const loginStore = useAuthStore((state) => state.login);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await api.post("/auth/register", { name, email, password });
      loginStore(response.data.token, response.data.user);
      router.push("/");
    } catch (err: any) {
      setError(err.response?.data?.error || "Registration failed. Try a different email.");
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
        <h2 className="text-2xl font-bold tracking-tight">Create Account</h2>
        <p className="text-sm text-apple-gray-300 mt-1">Get started with AI-powered personal finance</p>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl mb-6 font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-apple-gray-300 mb-2">Full Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="John Doe"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black transition-all bg-[#f5f5f7]/50"
          />
        </div>

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
            placeholder="Min. 6 characters"
            className="w-full px-4 py-3 rounded-xl border border-[#e8e8ed] text-sm focus:outline-none focus:border-black transition-all bg-[#f5f5f7]/50"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-black text-white py-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 hover:bg-black/90 active:scale-95 transition-all disabled:opacity-50"
        >
          {loading ? "Creating..." : "Sign Up"}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>

      <p className="text-center text-xs text-apple-gray-300 mt-6">
        Already have an account?{" "}
        <Link href="/login" className="text-black font-semibold hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
