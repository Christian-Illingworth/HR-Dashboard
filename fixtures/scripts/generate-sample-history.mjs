// Writes fixtures/sample-history.json: one synthetic "HRD Employee History" row per employee per
// month from 2025-10 to 2026-10, for months in which the employee was employed.
// It only lays out departments and roles. It calculates no metric.
// Run from the repo root: node fixtures/scripts/generate-sample-history.mjs
import { writeFileSync } from 'node:fs';

const E = (n) => `e0000000-0000-4000-8000-0000000000${String(n).padStart(2, '0')}`;
const T = (n) => `e0000000-0000-4000-8000-000000000${100 + n}`;

// [id, jobTitle, start, end, department (or a function of month)]
const people = [
  [E(1), 'Sales Team Manager', '2019-03-04', null, 'Sales'],
  [E(2), 'Energy Analyst', '2021-06-01', null, 'Sales'],
  [E(3), 'Senior Energy Analyst', '2021-12-01', null, 'Sales'],
  [E(4), 'Energy Analyst', '2024-01-08', null, (m) => (m >= '2026-08' ? 'Sales' : 'Analysis')],
  [E(5), 'Senior Pricing Specialist', '2018-05-21', null, 'Pricing'],
  [E(6), 'Senior Pricing Specialist', '2022-02-01', null, 'Pricing'],
  [E(7), 'Senior Energy Analyst', '2016-11-06', null, 'Analysis'],
  [E(8), 'Energy Analyst', '2023-04-03', null, 'Analysis'],
  [E(9), 'Energy Analyst', '2025-02-10', null, 'Analysis'],
  [E(10), 'Energy Analyst', '2022-08-15', null, 'Operations'],
  [E(11), 'Senior Energy Analyst', '2016-01-11', '2026-12-18', 'Operations'],
  [E(12), 'Energy Analyst', '2024-09-02', '2026-10-27', 'Analysis'],
  [E(13), 'Energy Analyst', '2023-10-02', null, 'Not set'],
  [E(14), 'Senior Energy Analyst', '2021-01-04', null, 'Not set'],
  [E(15), 'Energy Analyst', '2026-11-16', null, 'Pricing'],
  [T(1), 'Energy Analyst', '2022-03-07', '2026-02-27', 'Analysis'],
  [T(2), 'Energy Analyst', '2023-07-03', '2026-08-14', 'Sales'],
  [T(3), 'Senior Pricing Specialist', '2019-09-02', '2025-12-19', 'Pricing'],
  [T(4), 'Energy Analyst', '2025-11-03', '2026-05-29', 'Operations'],
];

const months = [];
for (let y = 2025, m = 10; y < 2026 || (y === 2026 && m <= 10); m === 12 ? ((m = 1), y++) : m++) {
  months.push(`${y}-${String(m).padStart(2, '0')}`);
}

const rows = [];
for (const [employeeId, jobTitle, start, end, dept] of people) {
  for (const month of months) {
    const employedInMonth = start.slice(0, 7) <= month && (end === null || end.slice(0, 7) >= month);
    if (!employedInMonth) continue;
    rows.push({ employeeId, month, department: typeof dept === 'function' ? dept(month) : dept, jobTitle });
  }
}
writeFileSync('fixtures/sample-history.json', JSON.stringify(rows, null, 1) + '\n');
console.log(`wrote ${rows.length} history rows`);
