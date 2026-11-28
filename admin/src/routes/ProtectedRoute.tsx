import React from "react";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/Login";

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex min-h-screen flex-col items-center justify-center gap-3 bg-white"
      >
        <img src="/images/RentalsLogo.png" alt="" width={120} height={60} className="h-12 w-auto" />
        <p className="text-sm text-slate-500">Checking session…</p>
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <>{children}</>;
}
