// FR-026: every section has distinct loading, empty and error states, and one section failing
// never blanks the others.

import type { ReactNode } from 'react';
import type { Section } from '@hrd/core';
import { ChartIcon } from './icons';

export type LoadingShape = 'chart' | 'list';

interface Props<T> {
  /** undefined while the first load is in progress. */
  section: Section<T> | undefined;
  emptyText: string;
  loadingShape?: LoadingShape;
  children: (data: T) => ReactNode;
}

export function SectionState<T>({ section, emptyText, loadingShape = 'chart', children }: Props<T>) {
  if (section === undefined) {
    return (
      <div className="hrd-state" aria-busy="true">
        <span className="visually-hidden">Loading</span>
        {loadingShape === 'chart' ? (
          <div className="skeleton hrd-skeleton-chart" />
        ) : (
          <>
            <div className="skeleton skeleton-line w-80" />
            <div className="skeleton skeleton-line w-60" />
            <div className="skeleton skeleton-line w-40" />
          </>
        )}
      </div>
    );
  }
  if (section.status === 'error') {
    return (
      <div className="notice tone-coral" role="alert">
        {section.message ?? 'This section could not be loaded.'}
      </div>
    );
  }
  if (section.status === 'empty' || section.data === undefined) {
    return (
      <div className="empty-state hrd-state">
        <ChartIcon />
        <span>{emptyText}</span>
      </div>
    );
  }
  return <>{children(section.data)}</>;
}
