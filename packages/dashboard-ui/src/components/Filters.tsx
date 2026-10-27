// US7, FR-021: department, role and month filters. Every section updates; "today" figures and
// the Sales list stay relative to today (FR-022).

import type { DashboardResponse } from '@hrd/core';
import { formatMonth, formatMonthLong, shiftMonth } from '../format';
import { Select } from './Select';

export interface FilterValues {
  month: string;
  department: string;
  role: string;
}

interface Props {
  filters: DashboardResponse['filters'];
  currentMonth: string;
  departmentHistoryStartMonth: string | null;
  onChange: (next: FilterValues) => void;
}

export function Filters({ filters, currentMonth, departmentHistoryStartMonth, onChange }: Props) {
  const { applied, options } = filters;
  const set = (patch: Partial<FilterValues>) => onChange({ ...applied, ...patch });
  const anyFilter = applied.department !== 'All' || applied.role !== 'All' || applied.month !== currentMonth;
  const windowStart = shiftMonth(applied.month, -3);
  const groupFiltered = applied.department !== 'All' || applied.role !== 'All';
  const usesEarliest = groupFiltered && departmentHistoryStartMonth !== null && windowStart < departmentHistoryStartMonth;

  return (
    <div className="stack">
      <div className="controls-row hrd-filters" role="group" aria-label="Filters">
        <Select
          id="hrd-f-dept"
          label="Department"
          value={applied.department}
          filtered={applied.department !== 'All'}
          options={options.departments.map((d) => ({ value: d, label: d === 'All' ? 'All departments' : d }))}
          onChange={(department) => set({ department })}
        />
        <Select
          id="hrd-f-role"
          label="Role"
          value={applied.role}
          filtered={applied.role !== 'All'}
          options={options.roles.map((r) => ({ value: r, label: r === 'All' ? 'All roles' : r }))}
          onChange={(role) => set({ role })}
        />
        <Select
          id="hrd-f-month"
          label="Month"
          value={applied.month}
          filtered={applied.month !== currentMonth}
          options={options.months.map((m) => ({
            value: m,
            label: m === currentMonth ? `${formatMonthLong(m)} (this month)` : formatMonthLong(m),
          }))}
          onChange={(month) => set({ month })}
        />
        {anyFilter && (
          <button type="button" className="btn-link" onClick={() => onChange({ month: currentMonth, department: 'All', role: 'All' })}>
            Clear filters
          </button>
        )}
      </div>
      {applied.month !== currentMonth && (
        <p className="caption">
          Charts show {formatMonth(windowStart)} to {formatMonth(shiftMonth(applied.month, 3))}. Today&apos;s numbers and
          &ldquo;Who&apos;s off in Sales&rdquo; still show today.
        </p>
      )}
      {usesEarliest && (
        <p className="caption">
          Departments and roles before {formatMonthLong(departmentHistoryStartMonth!)} use the earliest values known.
        </p>
      )}
    </div>
  );
}
