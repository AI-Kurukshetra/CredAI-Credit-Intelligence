"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { BorrowerWorkspace } from "@/components/borrower-workspace";
import { LenderDashboard } from "@/components/lender-dashboard";
import { useAuth } from "@/components/auth-provider";

export function RoleHome() {
  const router = useRouter();
  const { profile, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/login");
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-[var(--shadow)] dark:border-slate-800 dark:bg-slate-950/70 dark:text-slate-300">
          Loading workspace...
        </div>
      </main>
    );
  }

  return profile.role === "lender" ? <LenderDashboard /> : <BorrowerWorkspace />;
}
