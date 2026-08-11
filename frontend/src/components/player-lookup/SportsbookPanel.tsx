import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DeltaTag } from "@/components/ui/live-pulse";
import { cn } from "@/lib/utils";
import type { BookPrice } from "@/data/playerLookupFixtures";

interface Props {
  books: BookPrice[];
  side: "over" | "under";
}

/** American odds → implied probability, for comparing a price against fair. */
function impliedProbability(odds: string): number {
  const n = Number(odds);
  if (Number.isNaN(n)) return 0;
  return n > 0 ? 100 / (n + 100) : -n / (-n + 100);
}

/**
 * "Where to Bet It" — every tracked book against the Atlas fair price.
 *
 * The best available price is marked, and each row shows how far it sits from
 * fair in percentage points of implied probability, which is the comparison
 * that actually matters when the posted lines differ.
 */
export function SportsbookPanel({ books, side }: Props) {
  const fair = books.find((b) => b.isFair);
  const offers = books.filter((b) => !b.isFair);

  const priceOf = (b: BookPrice) => (side === "over" ? b.over : b.under);
  const fairProb = fair ? impliedProbability(priceOf(fair)) : 0;

  // Best price = lowest implied probability for the side being taken.
  const best = offers.reduce<BookPrice | null>(
    (acc, b) => (!acc || impliedProbability(priceOf(b)) < impliedProbability(priceOf(acc)) ? b : acc),
    null,
  );

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle>Where to bet it</CardTitle>
        <Badge variant="outline" className="ml-auto capitalize">
          {side}
        </Badge>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse">
            <thead>
              <tr className="border-b border-line text-left">
                {["Book", "Line", "Price", "vs fair", "Move"].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-2.5 text-[10px] font-medium tracking-[0.12em] text-fg-faint"
                  >
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {fair && (
                <tr className="border-b border-line bg-inset">
                  <td className="px-4 py-3 text-[13px] font-medium text-atlas">{fair.book}</td>
                  <td className="tabular px-4 py-3 text-[13px] text-fg">{fair.line.toFixed(1)}</td>
                  <td className="tabular px-4 py-3 text-[13px] font-semibold text-fg">
                    {priceOf(fair)}
                  </td>
                  <td className="px-4 py-3 text-[11px] text-fg-faint">Model price</td>
                  <td className="px-4 py-3 text-[11px] text-fg-faint">—</td>
                </tr>
              )}

              {offers.map((book) => {
                const prob = impliedProbability(priceOf(book));
                const edge = (fairProb - prob) * 100;
                const isBest = best?.book === book.book;

                return (
                  <tr
                    key={book.book}
                    className={cn(
                      "border-b border-line-faint transition-colors duration-[120ms] last:border-b-0",
                      "hover:bg-surface-hi",
                    )}
                  >
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-2">
                        <span className="text-[13px] text-fg">{book.book}</span>
                        {isBest && (
                          <Badge variant="atlas" size="sm">
                            Best
                          </Badge>
                        )}
                      </span>
                    </td>
                    <td className="tabular px-4 py-3 text-[13px] text-fg-muted">
                      {book.line.toFixed(1)}
                    </td>
                    <td
                      className={cn(
                        "tabular px-4 py-3 text-[13px] font-medium",
                        isBest ? "text-atlas" : "text-fg",
                      )}
                    >
                      {priceOf(book)}
                    </td>
                    <td
                      className={cn(
                        "tabular px-4 py-3 text-[12px]",
                        edge >= 0 ? "text-atlas" : "text-signal-crit",
                      )}
                    >
                      {edge >= 0 ? "+" : ""}
                      {edge.toFixed(1)}%
                    </td>
                    <td className="px-4 py-3">
                      <DeltaTag
                        delta={book.movement === 0 ? "0.0" : `${book.movement > 0 ? "+" : ""}${book.movement.toFixed(1)}`}
                        trend={book.movement > 0 ? "up" : book.movement < 0 ? "down" : "flat"}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <p className="border-t border-line-faint px-4 py-3 text-[11px] leading-relaxed text-fg-faint">
          "vs fair" compares each book's implied probability against the Atlas model price.
          Positive means the book is offering better than fair value on this side.
        </p>
      </CardContent>
    </Card>
  );
}
