import type { InputHTMLAttributes } from "react";

export function FormField({ label, ...props }: { label: string } & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-200">{label}</span>
      <input
        className="w-full rounded-lg border border-ink-700 bg-ink-800 px-3.5 py-2.5 text-sm text-ink-50
          placeholder:text-ink-500 focus:border-edge-500 focus:outline-none focus:ring-1 focus:ring-edge-500"
        {...props}
      />
    </label>
  );
}
