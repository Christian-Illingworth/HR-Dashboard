// A chart card: heading, a "Show table" toggle (FR-018), the chart or its table, the legend and
// any notes (coverage, forecast method, pending leave).

import { useState, type ReactNode } from 'react';
import type { Section } from '@hrd/core';
import { SectionCard } from '../components/SectionCard';
import { SectionState } from '../components/SectionState';
import { TableIcon } from '../components/icons';
import { BarChart } from './BarChart';
import { ChartTable } from './ChartTable';
import { Legend } from './Legend';
import type { ChartModel } from './model';

interface Props<T> {
  id: string;
  title: string;
  section: Section<T> | undefined;
  emptyText: string;
  toModel: (data: T) => ChartModel;
  notes?: (data: T) => ReactNode[];
  className?: string;
}

export function ChartSection<T>({ id, title, section, emptyText, toModel, notes, className }: Props<T>) {
  const [asTable, setAsTable] = useState(false);
  // A toggle keeps one name; aria-pressed (and the teal edge when pressed) says which view shows.
  const toggle = (
    <button type="button" className="btn-outline hrd-toggle" aria-pressed={asTable} onClick={() => setAsTable((t) => !t)}>
      <TableIcon /> Table view
    </button>
  );
  return (
    <SectionCard id={id} title={title} actions={section?.status === 'ok' ? toggle : undefined} className={className}>
      <SectionState section={section} emptyText={emptyText}>
        {(data) => {
          const model = toModel(data);
          const extraNotes = notes?.(data).filter(Boolean) ?? [];
          return (
            <>
              {asTable ? <ChartTable model={model} /> : <BarChart model={model} />}
              {!asTable && <Legend model={model} />}
              {extraNotes.length > 0 && (
                <div className="hrd-notes">
                  {extraNotes.map((n, i) => (
                    <p className="caption" key={i}>
                      {n}
                    </p>
                  ))}
                </div>
              )}
            </>
          );
        }}
      </SectionState>
    </SectionCard>
  );
}
