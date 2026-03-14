"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "@/components/auth-provider";
import { ProductLogo } from "@/components/product-logo";
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
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-sky-100 bg-white p-10 text-sm text-slate-500 shadow-[var(--shadow)]">
          Loading authenticated workspace...
        </div>
      </main>
    );
  }

  if (profile.role !== allowedRole) {
    const correctHome = profile.role === "borrower" ? "/apply" : "/";

    return (
      <main className="min-h-screen px-6 py-10">
        <div className="mx-auto max-w-4xl rounded-[32px] border border-sky-100 bg-white p-10 shadow-[var(--shadow)]">
          <p className="text-sm uppercase tracking-[0.18em] text-rose-700">
            Access denied
          </p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">
            This page is restricted to {allowedRole}s.
          </h1>
          <p className="mt-3 text-sm text-slate-500">
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
              className="rounded-full border border-sky-100 bg-white px-5 py-3 text-sm font-semibold text-slate-600"
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
    <main className="min-h-screen px-5 py-6 text-slate-950 sm:px-6 sm:py-8">
      <div className="mx-auto max-w-7xl">
        <header className="overflow-hidden rounded-[36px] border border-slate-900/20 bg-[linear-gradient(180deg,#020617_0%,#020817_100%)] px-6 py-6 text-white shadow-[0_28px_70px_rgba(2,6,23,0.24)] sm:px-8">
          <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between xl:justify-start xl:gap-6">
                <ProductLogo tone="light" />
                <nav className="flex flex-wrap gap-2 text-sm font-medium">
                  {profile.role === "borrower" ? (
                    <>
                      <NavLink href="/apply" label="New application" />
                      <NavLink href="/my-applications" label="My applications" />
                    </>
                  ) : (
                    <NavLink href="/" label="Dashboard" />
                  )}
                </nav>
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.22em] text-sky-300">
                  {profile.role === "borrower" ? "Borrower workspace" : "Lender workspace"}
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-300">
                  {description}
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <div className="rounded-[26px] border border-white/10 bg-white/5 px-4 py-3 text-sm text-white">
                <p className="font-semibold text-white">
                  {profile.fullName}
                </p>
                <p className="uppercase tracking-[0.16em] text-slate-400">
                  {profile.role}
                </p>
              </div>
              <button
                className="rounded-full border border-white/15 bg-transparent px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/8"
                onClick={() => void signOut()}
                type="button"
              >
                Sign out
              </button>
            </div>
          </div>
      <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <ShellPoint
              title="Structured intake"
              description="Borrower data, documents, and status progression are organized into clean steps."
            />
            <ShellPoint
              title="Decision trace"
              description="Scoring, manual review, and timeline events remain visible across the workflow."
            />
            <ShellPoint
              title="Single-tenant MVP"
              description="One model, one queue, and one operating surface without multi-tenant complexity."
            />
          </div>
        </header>
        <section className="mt-8">{children}</section>
      </div>
    </main>
  );
}

function NavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      className="rounded-full border border-white/12 bg-white/6 px-4 py-2 text-slate-100 transition hover:bg-white/12"
      href={href}
    >
      {label}
    </Link>
  );
}

function ShellPoint({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <article className="rounded-[24px] border border-white/10 bg-white/4 px-4 py-4">
      <p className="text-sm font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">
        {description}
      </p>
    </article>
  );
}
