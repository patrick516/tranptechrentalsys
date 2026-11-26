import React from "react";
import { useAuth } from "../context/AuthContext";
import LoginPage from "../pages/Login";

export default function ProtectedRoute({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-sm text-brand-navy">
        Checking session...
      </div>
    );
  }
  if (!user) return <LoginPage />;
  return <>{children}</>;
}
