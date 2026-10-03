import type { ReactNode } from "react";

export function PageHeader({ eyebrow, title, description, meta, actions }: { eyebrow?: string; title: string; description?: string; meta?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div className="page-header__copy">
        {eyebrow ? <span className="eyebrow">{eyebrow}</span> : null}
        <div className="page-header__title-row">
          <h1>{title}</h1>
          {meta}
        </div>
        {description ? <p>{description}</p> : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}

