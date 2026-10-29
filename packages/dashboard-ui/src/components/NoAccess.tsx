// FR-005, US2: someone outside the access group sees who to contact. No sections are rendered
// and no further data is requested; the API sends them no data anyway (FR-004).

import { LockIcon } from './icons';

export function NoAccess({ reason, contact }: { reason: 'forbidden' | 'unauthenticated'; contact: string }) {
  const contactText = contact.trim() || 'To ask for access, contact your HR team.';
  return (
    <div className="hrd-dashboard">
      <section className="card hrd-no-access" aria-labelledby="hrd-no-access-title">
        <LockIcon />
        {reason === 'forbidden' ? (
          <>
            <h2 className="title-lg" id="hrd-no-access-title">
              You don&apos;t have access to the HR Dashboard
            </h2>
            <p className="body-sm">The dashboard is limited to HR and Senior Leadership.</p>
          </>
        ) : (
          <>
            <h2 className="title-lg" id="hrd-no-access-title">
              We couldn&apos;t confirm who you are
            </h2>
            <p className="body-sm">Refresh the page, or sign out of Microsoft 365 and sign in again.</p>
          </>
        )}
        <p className="body-sm">{contactText}</p>
      </section>
    </div>
  );
}
