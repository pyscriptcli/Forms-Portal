"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { PrimeDialog } from "./PrimeDialog";

const STEPS = [
  { title: "Choose a form", text: "Select Request for payment, Purchase order, or Petty cash voucher in the form toolbar." },
  { title: "Add the details", text: "Enter the payee, department, items, and amounts. If autofill is enabled, upload a quotation to extract details, then review every field." },
  { title: "Attach and sign", text: "Add supporting documents and your signature. Check the calculated totals before submitting." },
  { title: "Submit your request", text: "Select Submit request. Keep the page open while the signed document and attachments are uploaded." },
  { title: "Follow its progress", text: "Open Request status to see the current stage. Department approvers review forms in Approvals. The Workflow page explains each role." },
];
export function PrototypeTourModal({ onPreFillDemo }: { onPreFillDemo?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const [mode, setMode] = useState<"guide" | "tour" | null>(null);
  const [step, setStep] = useState(0);
  useEffect(() => {
    const guide = () => setMode("guide");
    const tour = () => { setStep(0); setMode("tour"); };
    window.addEventListener("open-prototype-drawer", guide);
    window.addEventListener("open-prototype-tour", tour);
    return () => {
      window.removeEventListener("open-prototype-drawer", guide);
      window.removeEventListener("open-prototype-tour", tour);
    };
  }, []);
  function fillSample() {
    setMode(null);
    if (onPreFillDemo) onPreFillDemo();
    else if (pathname === "/") window.dispatchEvent(new CustomEvent("prefill-demo"));
    else router.push("/?prefill=true");
  }
  return (
    <PrimeDialog open={mode !== null} title={mode === "tour" ? STEPS[step].title : "Portal guide"} onClose={() => setMode(null)}
      actions={mode === "tour" ? <>
        <button className="prime-button secondary" disabled={step === 0} onClick={() => setStep(s => s - 1)}>Back</button>
        <button className="prime-button" onClick={() => step === STEPS.length - 1 ? setMode("guide") : setStep(s => s + 1)}>
          {step === STEPS.length - 1 ? "Finish" : "Next"}
        </button>
      </> : <>
        <button className="prime-button secondary" onClick={fillSample}>Fill sample</button>
        <button className="prime-button" onClick={() => { setStep(0); setMode("tour"); }}>Start walkthrough</button>
      </>}>
      {mode === "tour" ? <div aria-live="polite">
        <p className="prime-label mb-4">Step {step + 1} of {STEPS.length}</p>
        <p>{STEPS[step].text}</p>
        <div className="flex gap-2 mt-8" aria-hidden="true">{STEPS.map((_, i) => <span key={i} className={`h-1 flex-1 border border-prime-blue ${i <= step ? "bg-prime-blue" : "bg-prime-white"}`} />)}</div>
      </div> : <div className="space-y-6">
        <p>Prepare, submit, and follow your forms through the approval process.</p>
        <ol className="space-y-5">{STEPS.slice(0, 4).map((item, i) => <li key={item.title} className="flex gap-5">
          <span className="font-bebas text-3xl text-prime-blue leading-none">{String(i + 1).padStart(2, "0")}</span>
          <div><h3 className="text-sm font-medium text-prime-blue">{item.title}</h3><p className="text-sm mt-1">{item.text}</p></div>
        </li>)}</ol>
        <nav aria-label="Guide resources" className="flex flex-wrap gap-4 border-t border-prime-gold pt-5">
          {[["/approvals", "Approvals"], ["/track", "Request status"], ["/workflow", "Workflow"]].map(([href, label]) => <Link key={href} href={href} onClick={() => setMode(null)} className="text-prime-blue text-xs uppercase tracking-widest underline underline-offset-4">{label}</Link>)}
        </nav>
      </div>}
    </PrimeDialog>
  );
}
