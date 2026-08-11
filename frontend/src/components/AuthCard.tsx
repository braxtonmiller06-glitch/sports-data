import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Logo } from "./Logo";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-ink-950 px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex justify-center">
          <Link to="/">
            <Logo className="text-lg" />
          </Link>
        </div>
        <div className="rounded-2xl border border-ink-800 bg-ink-900 p-8 shadow-xl shadow-black/30">
          <h1 className="text-xl font-bold text-ink-50">{title}</h1>
          <p className="mt-1 text-sm text-ink-400">{subtitle}</p>
          <div className="mt-6">{children}</div>
        </div>
        <p className="mt-6 text-center text-sm text-ink-400">{footer}</p>
      </div>
    </div>
  );
}
