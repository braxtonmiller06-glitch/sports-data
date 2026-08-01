export function Logo({ className = "" }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 font-bold tracking-tight ${className}`}>
      <span className="flex h-7 w-7 items-center justify-center rounded-md bg-edge-500 text-ink-950">
        <svg viewBox="0 0 24 24" fill="none" className="h-4 w-4" strokeWidth={2.5}>
          <path d="M4 15L10 9L14 13L20 6" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M14 6H20V12" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span className="text-ink-50">Sharpline</span>
    </span>
  );
}
