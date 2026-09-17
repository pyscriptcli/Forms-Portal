"use client";

import Link from "next/link";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export default function ApproverDemoPage() {
  return <div className="max-w-6xl mx-auto space-y-6"><DemoModeBanner role="approver" /><header><p className="prime-label text-prime-blue">STAKEHOLDER PREVIEW</p><h1 className="prime-heading text-5xl">Approver view</h1><p className="text-sm text-prime-ink/70">Review the approval queue using the same portal workflow.</p></header><div className="border border-prime-rule bg-white p-8"><h2 className="prime-heading text-3xl">Approval queue</h2><p className="mt-2 text-sm">Demo actions are simulated and do not change ClickUp.</p><Link href="/approvals" className="inline-block mt-5 prime-button">Open approvals</Link></div></div>;
}
