import { ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSport } from "@/lib/sport-context";
import type { SportConfig } from "@/lib/sports";

/**
 * Shown when a sport has no fixture set behind it yet.
 *
 * Deliberately specific rather than a shrug: it names the stats, markets and
 * positions that sport will carry, and how its filters differ, so the empty
 * state still says something true about the product.
 */
export function SportComingSoon({ config }: { config: SportConfig }) {
  const { setSport } = useSport();

  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-5 px-6 py-14 text-center">
        <Badge variant="neutral">Coming soon</Badge>

        <div className="flex flex-col gap-2">
          <h3 className="text-lg font-semibold tracking-tight text-fg">
            {config.name} research is being built
          </h3>
          <p className="max-w-[56ch] text-[13px] leading-relaxed text-fg-muted">
            {config.note ??
              "The research layer for this sport is not connected yet."}{" "}
            Player Lookup is complete for basketball today.
          </p>
        </div>

        <dl className="grid w-full max-w-2xl grid-cols-1 gap-2.5 text-left sm:grid-cols-3">
          {[
            { label: "Markets", items: config.markets },
            { label: "Positions", items: config.positions },
            // Filters rather than stats: for prop markets the stat *is* the
            // market, so listing both showed the same four values twice.
            { label: "Filters", items: config.filters.map((f) => f.replace(/_/g, " ")) },
          ].map((group) => (
            <div
              key={group.label}
              className="flex flex-col gap-2 rounded-lg border border-line bg-inset px-4 py-3.5"
            >
              <dt className="text-[10px] font-medium tracking-wide text-fg-faint">
                {group.label}
              </dt>
              <dd className="flex flex-wrap gap-1.5">
                {group.items.slice(0, 5).map((item) => (
                  <span
                    key={item}
                    className="rounded border border-line bg-surface px-1.5 py-0.5 text-[11px] capitalize text-fg-muted"
                  >
                    {item}
                  </span>
                ))}
              </dd>
            </div>
          ))}
        </dl>

        <Button variant="secondary" onClick={() => setSport("nba")}>
          Switch to NBA
          <ArrowRight />
        </Button>
      </CardContent>
    </Card>
  );
}
