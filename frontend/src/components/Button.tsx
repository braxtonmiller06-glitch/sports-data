import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
}

const VARIANT_CLASSES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-edge-500 text-ink-950 hover:bg-edge-400 shadow-[0_0_0_1px_rgba(22,193,114,0.4),0_8px_24px_-8px_rgba(22,193,114,0.5)]",
  secondary: "bg-ink-800 text-ink-100 border border-ink-600 hover:border-ink-500 hover:bg-ink-700",
  ghost: "text-ink-200 hover:text-ink-50 hover:bg-ink-800",
};

export function Button({ variant = "primary", className = "", children, ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold
        transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50
        ${VARIANT_CLASSES[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
