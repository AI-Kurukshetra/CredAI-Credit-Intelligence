"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { UserRole } from "@/lib/domain";

export function AuthenticatedShell({
  children,
  allowedRole,
  title,
  description,
}: {
  children: React.ReactNode;
  allowedRole: UserRole;
  title: string;
  description: string;
}) {
  const router = useRouter();
  const { profile, isLoading, signOut } = useAuth();

  useEffect(() => {
    if (!isLoading && !profile) {
      router.replace("/login");
    }
  }, [isLoading, profile, router]);

  if (isLoading || !profile) {
    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-10 text-sm text-slate-600 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          Loading authenticated workspace...
        </div>
      </main>
    );
  }

  if (profile.role !== allowedRole) {
    const correctHome = profile.role === "borrower" ? "/apply" : "/";

    return (
      <main className="min-h-screen bg-slate-50 px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-slate-200 bg-white p-10 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <p className="text-sm uppercase tracking-[0.18em] text-rose-700">
            Access denied
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            This page is restricted to {allowedRole}s.
          </h1>
          <p className="mt-3 text-sm text-slate-600">
            Your signed-in role is <span className="font-semibold">{profile.role}</span>.
          </p>
          <div className="mt-6 flex gap-3">
            <Link
              className="rounded-full bg-slate-950 px-5 py-3 text-sm font-semibold text-white"
              href={correctHome}
            >
              Open my workspace
            </Link>
            <button
              className="rounded-full border border-slate-200 px-5 py-3 text-sm font-semibold text-slate-700"
              onClick={() => void signOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#e0f2fe,transparent_38%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_100%)] px-6 py-10 text-slate-950">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col gap-6 rounded-[36px] border border-white/70 bg-slate-950 px-8 py-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.25)] lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-sky-300">
              Credit Intelligence Platform
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight">{title}</h1>
            <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
              {description}
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="text-right text-sm text-slate-300">
              <p>{profile.fullName}</p>
              <p className="uppercase tracking-[0.16em] text-slate-400">
                {profile.role}
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
              onClick={() => void signOut()}
              type="button"
            >
              Sign out
            </button>
          </div>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}
