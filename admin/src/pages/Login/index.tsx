// Staff/Admin sign-in screen.
import React, { useState } from "react";
import { AlertCircle, Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "h-11 border-slate-300 bg-white shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export default function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    setSubmitting(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Sign-in failed. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Sign in to the Chair Rental System."
      footer="Authorised staff only"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            name="email"
            autoComplete="username"
            autoFocus
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "login-error" : undefined}
            placeholder="you@tranptech.mw"
            className={fieldClass}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
              onBlur={() => setCapsOn(false)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "login-error" : undefined}
              className={`${fieldClass} pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              aria-pressed={showPassword}
              className="absolute right-1 top-1/2 flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-md text-slate-500 hover:text-brand-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" aria-hidden />
              ) : (
                <Eye className="h-4 w-4" aria-hidden />
              )}
            </button>
          </div>
          {capsOn && <p className="text-xs text-slate-500">Caps Lock is on.</p>}
        </div>

        {error && (
          <p
            id="login-error"
            role="alert"
            className="flex items-start gap-2 text-sm text-red-600"
          >
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
            <span>{error}</span>
          </p>
        )}

        <Button
          type="submit"
          disabled={submitting || !email || !password}
          className="h-11 w-full shadow-none"
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Signing in…" : "Sign in"}
        </Button>
      </form>
    </AuthShell>
  );
}
