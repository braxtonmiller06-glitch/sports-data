import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useProfile } from "../hooks/useProfile";

const ITEM =
  "flex w-full items-center gap-2.5 border-t border-ink-800 px-4 py-2.5 text-left text-sm " +
  "text-ink-200 transition-colors first:border-t-0 hover:bg-edge-500/10 hover:text-ink-50";

function Icon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      className="h-4 w-4 shrink-0 text-ink-400"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  );
}

export function AccountMenu() {
  const { user, signOut } = useAuth();
  const { profile, isSubscribed } = useProfile();
  const [open, setOpen] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  // Close on an outside click or Escape. Both, because a dropdown that only
  // handles one of them feels broken in exactly the moment you need it gone.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (wrap.current && !wrap.current.contains(e.target as Node)) setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  if (!user) return null;

  const initials = (profile?.email ?? user.email ?? "?").slice(0, 2).toUpperCase();

  return (
    <div className="relative" ref={wrap}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={`flex items-center gap-2 rounded-lg border px-2.5 py-1.5 text-sm transition-colors
          ${
            open
              ? "border-edge-500 bg-edge-500/10 text-ink-50"
              : "border-ink-600 bg-ink-800 text-ink-200 hover:border-ink-500"
          }`}
      >
        <span className="flex h-6 w-6 items-center justify-center rounded border border-edge-500/40 bg-edge-500/10 text-[10px] font-semibold text-edge-400">
          {initials}
        </span>
        Account
        <svg viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-3 w-3">
          <path d="M2 4.5L6 8.5L10 4.5" />
        </svg>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 w-56 overflow-hidden rounded-lg
            border border-ink-700 bg-ink-900 shadow-[0_24px_55px_-16px_rgba(0,0,0,0.6)]"
        >
          <div className="border-b border-ink-800 px-4 py-3">
            <p className="truncate text-sm font-medium text-ink-50">{profile?.email ?? user.email}</p>
            <p className="mt-0.5 text-xs text-ink-400">{isSubscribed ? "Pro" : "Free"}</p>
          </div>
          <Link to="/dashboard" role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
            <Icon d="M4 19V5m0 14h16M8 15l4-5 3 3 5-6" />
            Dashboard
          </Link>
          <Link to="/settings" role="menuitem" className={ITEM} onClick={() => setOpen(false)}>
            <Icon d="M12 8.8a3.2 3.2 0 100 6.4 3.2 3.2 0 000-6.4M12 3v2.5M12 18.5V21M3 12h2.5M18.5 12H21M5.6 5.6l1.8 1.8M16.6 16.6l1.8 1.8M18.4 5.6l-1.8 1.8M7.4 16.6l-1.8 1.8" />
            Settings
          </Link>
          <button
            type="button"
            role="menuitem"
            className={ITEM}
            onClick={() => {
              setOpen(false);
              void signOut();
            }}
          >
            <Icon d="M15 17l5-5-5-5M20 12H9M11 4H5v16h6" />
            Sign out
          </button>
        </div>
      ) : null}
    </div>
  );
}
