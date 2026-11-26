// Staff/Admin sign-in screen styled with TranpTech brand blue (#005098), green (#289030), and navy (#101D29)
import React, { useState } from "react";
import { useAuth } from "../../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 font-sans text-brand-navy">
      <div className="w-full max-w-md rounded-lg border border-brand-blue bg-white p-6 shadow-sm">
        <div className="inline-block rounded-sm bg-brand-blue px-2.5 py-0.5 text-xs font-semibold text-white">
          TranpTech
        </div>
        <h1 className="mt-2 text-xl font-bold text-brand-navy">
          Chair Rental System
        </h1>
        <p className="mt-1 text-sm text-brand-navy/80">
          Sign in to manage bookings, chair stock, and MK ledgers.
        </p>

        {error && (
          <div className="mt-4 rounded-md border border-brand-navy bg-brand-navy px-3 py-2 text-sm text-white">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-brand-navy">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
              placeholder="admin@tranptech.mw"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-navy">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 w-full rounded-md border border-brand-blue bg-white px-3 py-2 text-sm text-brand-navy focus:outline-none focus:ring-2 focus:ring-brand-green"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-md bg-brand-blue px-4 py-2 text-sm font-semibold text-white hover:bg-brand-navy disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
