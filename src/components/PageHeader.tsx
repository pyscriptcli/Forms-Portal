import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, actions }: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="prime-page-header">
      <div className="text-left flex-1 min-w-0">
        {eyebrow && <p className="prime-label text-left">{eyebrow}</p>}
        <h1 className="text-left">{title}</h1>
        {description && <p className="text-left">{description}</p>}
      </div>
      {actions && <div className="prime-page-header-actions shrink-0">{actions}</div>}
    </header>
  );
}
