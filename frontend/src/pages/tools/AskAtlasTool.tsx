import { useRef, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp, Quote, Sparkles } from "lucide-react";
import { ToolShell } from "@/components/tools/ToolShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAccess } from "@/lib/access";
import { TIER_LABEL, FEATURES } from "@/lib/access";
import { TOOLS } from "@/lib/tools";
import { cardVariants } from "@/lib/motion";
import { cn } from "@/lib/utils";
import { ASK_EXAMPLES, ASK_SUGGESTIONS, DATE_OPTIONS, SPORT_OPTIONS } from "@/data/toolsFixtures";

const TOOL = TOOLS.find((t) => t.id === "ask-atlas")!;
const EXAMPLE = ASK_EXAMPLES[0];

export default function AskAtlasPage() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { can, requestUpgrade } = useAccess();
  const [sport, setSport] = useState("all");
  const [date, setDate] = useState("today");
  const [query, setQuery] = useState("");
  const [shown, setShown] = useState(true);

  const unlocked = can("ask_atlas");
  const requiredTier = FEATURES.ask_atlas.minTier;

  function ask(text?: string) {
    if (!unlocked) {
      requestUpgrade("ask_atlas");
      return;
    }
    if (text) setQuery(text);
    setShown(true);
    inputRef.current?.focus();
  }

  return (
    <ToolShell
      tool={TOOL}
      lastUpdated="Grounded in the 11:42 snapshot"
      controls={
        <>
          <Select label="Sport" options={SPORT_OPTIONS} value={sport} onChange={(e) => setSport(e.target.value)} />
          <Select label="Date" options={DATE_OPTIONS} value={date} onChange={(e) => setDate(e.target.value)} />
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-8">
          {/* Composer */}
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div
                className={cn(
                  "flex items-center gap-3 rounded-xl border border-line bg-inset px-4",
                  "transition-colors duration-[180ms] focus-within:border-atlas/50",
                )}
              >
                <Sparkles className={cn("size-4 shrink-0", unlocked ? "text-atlas" : "text-fg-faint")} />
                <label htmlFor="ask-atlas-tool" className="sr-only">
                  Ask Atlas a question
                </label>
                <input
                  id="ask-atlas-tool"
                  ref={inputRef}
                  type="text"
                  autoComplete="off"
                  value={query}
                  readOnly={!unlocked}
                  onChange={(e) => setQuery(e.target.value)}
                  onClick={() => !unlocked && requestUpgrade("ask_atlas")}
                  onKeyDown={(e) => e.key === "Enter" && ask()}
                  placeholder="Ask Atlas..."
                  className={cn(
                    "min-w-0 flex-1 bg-transparent py-4 text-[15px] text-fg outline-none",
                    "placeholder:text-fg-faint",
                    !unlocked && "cursor-pointer",
                  )}
                />
                <Button
                  size="icon"
                  variant="primary"
                  aria-label={unlocked ? "Send question" : `Unlock with ${TIER_LABEL[requiredTier]}`}
                  disabled={unlocked && query.trim().length === 0}
                  onClick={() => ask()}
                  className="shrink-0"
                >
                  <ArrowUp />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {ASK_SUGGESTIONS.map((suggestion) => (
                  <button
                    key={suggestion}
                    type="button"
                    onClick={() => ask(suggestion)}
                    className={cn(
                      "rounded-lg border border-line px-3 py-2 text-[12px] text-fg-muted",
                      "outline-none transition-colors duration-[120ms]",
                      "hover:border-line-hi hover:bg-surface-hi hover:text-fg",
                    )}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Worked example — visible to every tier, so the answer shape is
              understood before anyone pays for it. */}
          {shown && (
            <Card>
              <CardHeader>
                <CardTitle>Example answer</CardTitle>
                <Badge variant="outline" className="ml-auto">
                  Sample
                </Badge>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <p className="flex items-start gap-2.5 text-[14px] font-medium text-fg">
                  <Quote className="mt-1 size-3.5 shrink-0 text-fg-faint" />
                  {EXAMPLE.question}
                </p>
                <p className="max-w-[74ch] text-[13.5px] leading-relaxed text-fg-muted">
                  {EXAMPLE.answer}
                </p>
                <div className="flex flex-wrap items-center gap-2 border-t border-line-faint pt-4">
                  <span className="text-[10px] font-medium tracking-[0.12em] text-fg-faint">
                    DERIVED FROM
                  </span>
                  {EXAMPLE.citations.map((citation) => (
                    <Badge key={citation} variant="neutral">
                      {citation}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>

        <motion.div variants={cardVariants} className="flex min-w-0 flex-col gap-5 xl:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>How Atlas answers</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-[13px] leading-relaxed text-fg-muted">
                Every answer is grounded in the same filter output and market snapshots the rest
                of the terminal reads. Nothing is asserted without a traceable source, and each
                response lists what it was derived from.
              </p>
              <p className="text-[13px] leading-relaxed text-fg-muted">
                If the research does not support an answer, Atlas says so rather than guessing.
              </p>
              {!unlocked && (
                <p className="text-[11px] leading-relaxed text-fg-faint">
                  Asking your own questions is included with {TIER_LABEL[requiredTier]}. The
                  worked example above is open to everyone.
                </p>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </ToolShell>
  );
}
