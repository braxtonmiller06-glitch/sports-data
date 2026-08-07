import { motion } from "framer-motion";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AppShell } from "@/components/layout/AppShell";
import { titleForPath } from "@/components/navigation/nav-config";
import { cardVariants } from "@/lib/motion";

/**
 * Stands in for every destination the sidebar can reach but that has no page
 * yet, so navigation is fully walkable while the shell is being reviewed.
 */
export default function PlaceholderPage() {
  const { pathname } = useLocation();
  const title = titleForPath(pathname);

  return (
    <AppShell>
      <motion.div variants={cardVariants} className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
          <Badge variant="outline">Not built yet</Badge>
        </div>

        <Card className="items-center justify-center gap-3 px-6 py-20 text-center">
          <p className="text-sm font-medium text-fg">This page has not been built.</p>
          <p className="max-w-sm text-[13px] leading-relaxed text-fg-muted">
            The shell, navigation and design system are in place. Drop a page component
            at this route and it inherits all of it.
          </p>
          <code className="mt-1 rounded-md border border-line bg-inset px-2.5 py-1 font-mono text-[11px] text-fg-faint">
            {pathname}
          </code>
        </Card>
      </motion.div>
    </AppShell>
  );
}
