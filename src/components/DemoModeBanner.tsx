"use client";

import Link from "next/link";

export function DemoModeBanner({ role }: { role: "requestor" | "approver" }) {
  const other = role === "requestor" ? "approver" : "requestor";
  return <div className="border border-prime-gold bg-prime-gold/10 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
    <span className="prime-label text-prime-blue">🎭 DEMO MODE · {role === "requestor" ? "Requestor" : "Approver"} Perspective</span>
    <div className="flex gap-3 text-xs font-semibold">
      <Link href={`/${other}-view`} className="text-prime-blue underline">View as {other === "approver" ? "Approver" : "Requestor"} →</Link>
      <Link href="/admin" className="text-prime-ink/70 underline">Admin settings</Link>
    </div>
  </div>;
}
