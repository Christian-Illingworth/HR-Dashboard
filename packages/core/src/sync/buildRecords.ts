// Turns BrightHR DTOs and Entra users into stored records (data-model §2). Pure: the sync
// function (Milestone 2) and the web part's mock-data mode both use it.

import type { AbsenceDto, EmployeeDto, IsoDate } from '../brighthr/types';
import { normaliseAbsence, normaliseEmployee } from '../brighthr/normalise';
import { NOT_SET, type AbsenceRecord, type EmployeeRecord, type Settings } from '../records/types';

export interface DirectoryUser {
  mail: string | null;
  userPrincipalName: string | null;
  department: string | null;
}

/** A sickness reason held in memory until the sync decides whether to keep it (R13). */
export interface ReasonCandidate {
  absenceId: string;
  employeeId: string;
  reason: string;
  startDate: IsoDate;
  endDate: IsoDate | null;
}

export interface BuildRecordsInput {
  employees: readonly EmployeeDto[];
  absencesByEmployee: Readonly<Record<string, readonly AbsenceDto[]>>;
  entraUsers: readonly DirectoryUser[];
  settings: Settings;
  today: IsoDate;
}

export interface BuildRecordsOutput {
  employees: EmployeeRecord[];
  absences: AbsenceRecord[];
  reasonCandidates: ReasonCandidate[];
  warnings: { departmentNotSet: number; skippedRecords: number };
}

const lower = (s: string | null | undefined) => (s ?? '').trim().toLowerCase();

export function isSalesDepartment(department: string, settings: Settings): boolean {
  const d = lower(department);
  return settings.salesDepartments.some((s) => lower(s) === d);
}

export function buildRecords(input: BuildRecordsInput): BuildRecordsOutput {
  const { settings, today } = input;
  const departmentByEmail = new Map<string, string>();
  for (const u of input.entraUsers) {
    for (const key of [lower(u.mail), lower(u.userPrincipalName)]) {
      if (key && !departmentByEmail.has(key)) departmentByEmail.set(key, (u.department ?? '').trim());
    }
  }
  const pregnancyReasons = new Set(settings.pregnancyRelatedReasons.map(lower));

  let skippedRecords = 0;
  const employees: EmployeeRecord[] = [];
  for (const dto of input.employees) {
    const e = normaliseEmployee(dto);
    if (!e.startDate) {
      skippedRecords++;
      continue;
    }
    const department = departmentByEmail.get(lower(e.email)) || NOT_SET;
    // Names: Sales staff for the Sales list (001), and everyone employed on the sync date while
    // AnniversaryNames is on (002 FR-014, FR-015). Leavers' and future starters' names aren't kept.
    const employedToday = e.startDate <= today && (e.endDate === null || e.endDate >= today);
    const named = isSalesDepartment(department, settings) || (settings.anniversaryNames && employedToday);
    employees.push({
      employeeId: e.employeeId,
      startDate: e.startDate,
      endDate: e.endDate,
      jobTitle: e.jobTitle?.trim() || NOT_SET,
      department,
      givenName: named ? e.givenName : null,
      familyName: named ? e.familyName : null,
    });
  }

  const known = new Set(employees.map((e) => e.employeeId));
  const absences: AbsenceRecord[] = [];
  const reasonCandidates: ReasonCandidate[] = [];
  for (const [employeeId, list] of Object.entries(input.absencesByEmployee)) {
    if (!known.has(employeeId)) continue;
    for (const dto of list) {
      const a = normaliseAbsence(dto);
      if (a.end && a.end.date < a.start.date) {
        skippedRecords++;
        continue;
      }
      absences.push({
        absenceId: a.absenceId,
        employeeId: a.employeeId,
        brightHrType: a.brightHrType,
        displayName: a.displayName,
        startDate: a.start.date,
        startPart: a.start.part,
        endDate: a.end?.date ?? null,
        endPart: a.end?.part ?? null,
        durationDays: a.durationDays,
        durationMinutes: a.durationMinutes,
        pregnancyRelated: a.reason !== null && pregnancyReasons.has(lower(a.reason)),
      });
      if (a.reason !== null) {
        reasonCandidates.push({
          absenceId: a.absenceId,
          employeeId: a.employeeId,
          reason: a.reason,
          startDate: a.start.date,
          endDate: a.end?.date ?? null,
        });
      }
    }
  }

  const departmentNotSet = employees.filter(
    (e) => e.department === NOT_SET && (e.endDate === null || e.endDate >= today),
  ).length;

  return { employees, absences, reasonCandidates, warnings: { departmentNotSet, skippedRecords } };
}
