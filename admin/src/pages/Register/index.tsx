// One-time first-run screen: shown only while the database has no users at
// all. The account created here becomes the administrator; after that every
// other account is added from inside the system.
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "h-10 border-slate-300 bg-white shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

export default function RegisterPage() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const tooShort = password.length > 0 && password.length < 10;
  const mismatch = confirm.length > 0 && password !== confirm;

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (submitting) return;
    setError("");
    if (password !== confirm) {
      setError("The two passwords do not match.");
      return;
    }
    setSubmitting(true);
    try {
      await register({ name: name.trim(), email: email.trim(), password });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not create the account. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-4 py-10 font-sans text-brand-navy">
      <div className="w-full max-w-sm sm:rounded-xl sm:border sm:border-slate-200 sm:p-8">
        <img
          src="/images/RentalsLogo.png"
          alt="TranpTech Rentals"
          width={160}
          height={80}
          className="mx-auto h-20 w-auto"
        />

        <div className="mt-6 text-center">
          <h1 className="text-2xl font-semibold tracking-tight">
            Set up the system
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            No accounts exist yet — create the first one.
          </p>
        </div>

        <div className="mt-5 flex items-start gap-2 rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-600">
          <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden />
          <span>
            This account becomes the <strong>administrator</strong>. It is the
            only one that can be self-registered — afterwards every other user
            is added from inside the portal.
          </span>
        </div>

        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          <div className="space-y-2">
            <Label htmlFor="name">Full name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="name"
              autoFocus
              required
              maxLength={120}
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              placeholder="Ada Banda"
              className={fieldClass}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              name="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={submitting}
              aria-invalid={Boolean(error)}
              placeholder="owner@tranptech.mw"
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
                autoComplete="new-password"
                required
                minLength={10}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={submitting}
                aria-invalid={tooShort || Boolean(error)}
                placeholder="At least 10 characters"
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
            {tooShort && (
              <p className="text-xs text-slate-500">
                Use at least 10 characters.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm password</Label>
            <Input
              id="confirm"
              type={showPassword ? "text" : "password"}
              name="confirmPassword"
              autoComplete="new-password"
              required
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              disabled={submitting}
              aria-invalid={mismatch || Boolean(error)}
              placeholder="Repeat the password"
              className={fieldClass}
            />
            {mismatch && (
              <p className="text-xs text-red-600">The passwords do not match.</p>
            )}
          </div>

          {error && (
            <p
              id="register-error"
              role="alert"
              className="flex items-start gap-2 text-sm text-red-600"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
              <span>{error}</span>
            </p>
          )}

          <Button
            type="submit"
            disabled={
              submitting ||
              !name.trim() ||
              !email.trim() ||
              password.length < 10 ||
              password !== confirm
            }
            className="h-10 w-full shadow-none"
          >
            {submitting && <Loader2 className="animate-spin" aria-hidden />}
            {submitting ? "Creating account…" : "Create admin account"}
          </Button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-500">
          One-time setup &middot; closes as soon as this account exists
        </p>
      </div>
    </main>
  );
}
