import { useEffect, useRef, useState } from "react";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/** Renders ⌘ on Apple platforms and Ctrl everywhere else. */
function usePlatformMeta() {
  const [isApple, setIsApple] = useState(false);
  useEffect(() => {
    setIsApple(/Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent));
  }, []);
  return isApple ? "⌘" : "Ctrl";
}

export function KbdHint({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded border border-line",
        "bg-surface-hi px-1.5 font-mono text-[10px] font-medium text-fg-faint",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/**
 * Global search field. The shell owns the shortcut and the focus behaviour;
 * results are a later concern, so submitting does nothing yet.
 */
export function GlobalSearch({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const meta = usePlatformMeta();
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key.toLowerCase() === "k" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        inputRef.current?.focus();
      }
      if (event.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div
      className={cn(
        "relative flex h-9 items-center gap-2.5 rounded-lg border bg-inset px-3",
        "transition-colors duration-[180ms]",
        focused ? "border-atlas/50" : "border-line hover:border-line-hi",
        className,
      )}
    >
      <Search className="size-4 shrink-0 text-fg-faint" />
      <label htmlFor="atlas-global-search" className="sr-only">
        Search Atlas
      </label>
      <input
        id="atlas-global-search"
        ref={inputRef}
        type="text"
        autoComplete="off"
        spellCheck={false}
        placeholder="Search Atlas..."
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        className={cn(
          "min-w-0 flex-1 bg-transparent text-[13px] text-fg outline-none",
          "placeholder:text-fg-faint",
        )}
      />
      {/* Rendered as two keys: "CtrlK" run together reads as one token. */}
      <span className="hidden shrink-0 items-center gap-1 sm:flex">
        <KbdHint>{meta}</KbdHint>
        <KbdHint>K</KbdHint>
      </span>
    </div>
  );
}
