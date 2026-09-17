"use client";

import Link from "next/link";
import { DemoModeBanner } from "@/components/DemoModeBanner";

export default function RequestorDemoPage() {
  return <div className="max-w-6xl mx-auto space-y-6"><DemoModeBanner role="requestor" /><header><p className="prime-label text-prime-blue">STAKEHOLDER PREVIEW</p><h1 className="prime-heading text-5xl">Requestor view</h1><p className="text-sm text-prime-ink/70">Create a request and monitor its ClickUp-backed progress.</p></header><div className="grid md:grid-cols-2 gap-5"><Link href="/form" className="border border-prime-rule bg-white p-8 hover:border-prime-blue"><h2 className="prime-heading text-3xl">Submit a request</h2><p className="mt-2 text-sm">Open the request form with TL approval controls locked.</p></Link><Link href="/requests" className="border border-prime-rule bg-white p-8 hover:border-prime-blue"><h2 className="prime-heading text-3xl">Track requests</h2><p className="mt-2 text-sm">View statuses, milestone timestamps, and request details.</p></Link></div></div>;
}
