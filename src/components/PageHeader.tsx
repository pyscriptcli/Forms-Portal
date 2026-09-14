import type { ReactNode } from "react";

export function PageHeader({ title, description, eyebrow, actions }: {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="prime-page-header">
      <div>
        {eyebrow && <p className="prime-label">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p>{description}</p>}
      </div>
      {actions && <div className="prime-page-header-actions">{actions}</div>}
    </header>
  );
}
