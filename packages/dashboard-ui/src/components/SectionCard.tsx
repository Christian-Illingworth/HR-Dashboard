import type { ReactNode } from 'react';

interface Props {
  id: string;
  title: string;
  actions?: ReactNode;
  className?: string;
  children: ReactNode;
}

/** A dashboard section: a kit card with an h3 heading and an optional actions slot. */
export function SectionCard({ id, title, actions, className = '', children }: Props) {
  return (
    <section className={`card card--compact hrd-section ${className}`.trim()} aria-labelledby={`${id}-title`}>
      <div className="hrd-section-head">
        <h3 className="title-md" id={`${id}-title`}>
          {title}
        </h3>
        {actions && <div className="hrd-section-actions">{actions}</div>}
      </div>
      {children}
    </section>
  );
}
