"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/** Native modal focus containment, Escape handling, and focus restoration. */
export function PrimeDialog({ open, title, onClose, children, actions }: {
  open: boolean;
  title: string;
  onClose?: () => void;
  children: ReactNode;
  actions?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!open || !dialog) return;
    dialog.showModal();
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
    };
  }, [open]);
  if (!open) return null;
  return (
    <dialog ref={ref} className="prime-dialog" aria-labelledby={titleId}
      onCancel={event => { event.preventDefault(); onClose?.(); }}>
      <header className="prime-dialog-header">
        <h2 id={titleId}>{title}</h2>
        {onClose && <button type="button" className="prime-icon-button shrink-0" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>}
      </header>
      <div className="prime-dialog-content">{children}</div>
      {actions && <footer className="prime-dialog-actions">{actions}</footer>}
    </dialog>
  );
}
