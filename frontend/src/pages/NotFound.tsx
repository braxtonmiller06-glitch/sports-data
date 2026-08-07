import { motion } from "framer-motion";
import { Link, useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import { ROUTES } from "@/lib/routes";
import { cardVariants } from "@/lib/motion";

/**
 * Catch-all. Any path the router does not recognise lands here inside the
 * normal shell, so a mistyped or stale link is a recoverable dead end with the
 * sidebar still available rather than a blank screen.
 */
export default function NotFoundPage() {
  const { pathname } = useLocation();

  return (
    <AppShell>
      <motion.div variants={cardVariants}>
        <Card className="items-center justify-center gap-3 px-6 py-20 text-center">
          <p className="text-sm font-medium text-fg">This page doesn't exist.</p>
          <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
            Nothing is registered at that address. It may have moved, or the link may be
            out of date.
          </p>
          <code className="mt-1 rounded-md border border-line bg-inset px-2.5 py-1 font-mono text-[11px] text-fg-faint">
            {pathname}
          </code>
          <Button variant="secondary" asChild className="mt-3">
            <Link to={ROUTES.dashboard}>Back to overview</Link>
          </Button>
        </Card>
      </motion.div>
    </AppShell>
  );
}
