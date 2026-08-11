import { Navbar } from "../components/Navbar";
import { Container } from "../components/Container";
import { PickCard } from "../components/PickCard";
import { Button } from "../components/Button";
import { usePicks } from "../hooks/usePicks";
import { useProfile } from "../hooks/useProfile";
import { samplePick } from "../data/samplePick";

const FREE_TIER_VISIBLE_VERDICTS = new Set(["LEAN", "PASS"]);

export default function Dashboard() {
  const { picks, loading, error } = usePicks();
  const { isSubscribed, loading: profileLoading } = useProfile();

  const showingSample = !loading && !error && picks.length === 0;
  const displayPicks = showingSample ? [samplePick] : picks;

  return (
    <div className="min-h-screen bg-ink-950">
      <Navbar />
      <Container className="py-10">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink-50">Today's picks</h1>
            <p className="mt-1 text-sm text-ink-400">
              {isSubscribed ? "Full filter breakdowns unlocked." : "Upgrade to unlock full filter breakdowns."}
            </p>
          </div>
          {!isSubscribed && !profileLoading && (
            <a href="/#pricing">
              <Button>Upgrade to Sharp</Button>
            </a>
          )}
        </div>

        {showingSample && (
          <div className="mb-6 rounded-lg border border-ink-700 bg-ink-900 px-4 py-3 text-sm text-ink-400">
            No live picks yet -- showing an illustrative sample so you can see the layout.
          </div>
        )}

        {loading ? (
          <div className="py-20 text-center text-ink-500">Loading picks…</div>
        ) : error ? (
          <div className="rounded-lg border border-danger-500/30 bg-danger-500/10 px-4 py-3 text-sm text-danger-500">
            Couldn't load picks: {error}
          </div>
        ) : (
          <div className="space-y-5">
            {displayPicks.map((pick) => {
              const locked = !isSubscribed && !FREE_TIER_VISIBLE_VERDICTS.has(pick.verdict);
              return <PickCard key={pick.id} pick={pick} locked={locked} />;
            })}
          </div>
        )}
      </Container>
    </div>
  );
}
