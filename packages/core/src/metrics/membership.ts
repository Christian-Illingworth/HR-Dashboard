// Metric: docs/metric-catalogue.md#d3

import type { IsoDate } from '../brighthr/types';
import { ALL } from '../dashboard/types';
import { monthOf } from '../dates';
import type { EmployeeHistoryRow, EmployeeRecord, Month } from '../records/types';

export interface GroupInfo {
  department: string;
  jobTitle: string;
}

export interface GroupFilter {
  department: string;
  role: string;
}

export interface Membership {
  /** An employee's department and job title as at `date` (D3). */
  at(employeeId: string, date: IsoDate): GroupInfo;
  departmentHistoryStartMonth: Month | null;
}

/**
 * D3. Today, the current month and the future use current values. A past month uses that
 * month's history row, else the latest row before it, else the earliest row, else current.
 */
export function createMembership(
  employees: readonly EmployeeRecord[],
  history: readonly EmployeeHistoryRow[],
  today: IsoDate,
): Membership {
  const currentMonth = monthOf(today);
  const current = new Map(employees.map((e) => [e.employeeId, { department: e.department, jobTitle: e.jobTitle }]));
  const rowsByEmployee = new Map<string, EmployeeHistoryRow[]>();
  for (const r of history) {
    const list = rowsByEmployee.get(r.employeeId) ?? [];
    list.push(r);
    rowsByEmployee.set(r.employeeId, list);
  }
  for (const list of rowsByEmployee.values()) list.sort((a, b) => a.month.localeCompare(b.month));

  const startMonth = history.length === 0 ? null : history.map((r) => r.month).sort()[0]!;

  return {
    departmentHistoryStartMonth: startMonth,
    at(employeeId, date) {
      const now = current.get(employeeId) ?? { department: 'Not set', jobTitle: 'Not set' };
      const month = monthOf(date);
      if (month >= currentMonth) return now;
      const rows = rowsByEmployee.get(employeeId);
      if (!rows || rows.length === 0) return now;
      let chosen = rows[0]!;
      for (const r of rows) if (r.month <= month) chosen = r;
      return { department: chosen.department, jobTitle: chosen.jobTitle };
    },
  };
}

export function inGroup(info: GroupInfo, filter: GroupFilter): boolean {
  return (
    (filter.department === ALL || info.department === filter.department) &&
    (filter.role === ALL || info.jobTitle === filter.role)
  );
}
