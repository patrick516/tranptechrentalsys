// One-time first-run screen: shown only while the database has no users.
import { useState, type FormEvent } from "react";
import { AlertCircle, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import AuthShell from "@/components/auth/AuthShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const fieldClass =
  "h-11 border-slate-300 bg-white shadow-none placeholder:text-slate-400 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/25";

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
    <AuthShell
      title="Set up the system"
      subtitle="No accounts exist yet. Create the first one."
      footer="One-time setup · closes as soon as this account exists"
    >
      <div className="mb-6 flex items-start gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
        <ShieldCheck
          className="mt-0.5 h-4 w-4 shrink-0 text-primary"
          aria-hidden
        />
        <span>
          This account becomes the <strong>administrator</strong>. Every other
          user is added from inside the portal.
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
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
            placeholder="owner@tranptech.mw"
            className={fieldClass}
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
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
                aria-invalid={tooShort}
                placeholder="10+ characters"
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
              aria-invalid={mismatch}
              placeholder="Repeat password"
              className={fieldClass}
            />
            {mismatch && (
              <p className="text-xs text-red-600">Passwords do not match.</p>
            )}
          </div>
        </div>

        {error && (
          <p
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
          className="h-11 w-full shadow-none"
        >
          {submitting && <Loader2 className="animate-spin" aria-hidden />}
          {submitting ? "Creating account…" : "Create admin account"}
        </Button>
      </form>
    </AuthShell>
  );
}
