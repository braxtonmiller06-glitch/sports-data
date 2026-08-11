const STYLES: Record<string, string> = {
  BET: "bg-edge-500/15 text-edge-400 ring-1 ring-edge-500/40",
  PLAYABLE: "bg-edge-500/10 text-edge-300 ring-1 ring-edge-500/25",
  LEAN: "bg-warn-500/10 text-warn-500 ring-1 ring-warn-500/30",
  PASS: "bg-ink-700 text-ink-300 ring-1 ring-ink-600",
};

export function VerdictBadge({ verdict }: { verdict: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold tracking-wide uppercase ${STYLES[verdict] ?? STYLES.PASS}`}
    >
      {verdict}
    </span>
  );
}
