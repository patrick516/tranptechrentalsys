import React from "react";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/Login";
import RegisterPage from "../pages/Register";
import { Button } from "@/components/ui/button";

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white px-4 text-center"
    >
      <img
        src="/images/RentalsLogo.png"
        alt=""
        width={120}
        height={60}
        className="h-12 w-auto"
      />
      {children}
    </div>
  );
}

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading, needsSetup, setupError, retrySetup } = useAuth();

  if (loading) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">Checking session…</p>
      </Centered>
    );
  }
  if (user) return <>{children}</>;

  if (setupError) {
    return (
      <Centered>
        <p className="text-sm text-slate-600">Could not reach the server.</p>
        <Button variant="outline" onClick={retrySetup}>
          Try again
        </Button>
      </Centered>
    );
  }
  if (needsSetup === null) {
    return (
      <Centered>
        <p className="text-sm text-slate-500">Checking setup…</p>
      </Centered>
    );
  }

  // No users in the database yet: first-run registration instead of sign-in.
  return needsSetup ? <RegisterPage /> : <LoginPage />;
}
