// The allow-list (constitution Principle II, data-model §1): only the fields named here leave
// a BrightHR DTO. Everything else, including `note`, `reason.id`, `isCertified`,
// `estimatedReturn`, `isPaid`, `paidDuration`, `externalReference` and `payrollNumber`, is
// dropped. Fields not in docs/data-inventory.md must not be added here.

import type { AbsenceBoundaryDto, AbsenceDto, EmployeeDto, IsoDate } from './types';
import { isSicknessDto } from './types';
import type { BoundaryPart } from '../records/types';

export interface NormalisedEmployee {
  employeeId: string;
  startDate: IsoDate | null;
  endDate: IsoDate | null;
  jobTitle: string | null;
  givenName: string;
  familyName: string;
  /** Used during the sync for Entra matching only. Never stored. */
  email: string;
}

export function normaliseEmployee(dto: EmployeeDto): NormalisedEmployee {
  return {
    employeeId: dto.id,
    startDate: dto.employment.start,
    endDate: dto.employment.end,
    jobTitle: dto.employment.jobTitle,
    givenName: dto.name.givenName,
    familyName: dto.name.familyName,
    email: dto.email,
  };
}

export interface NormalisedBoundary {
  date: IsoDate;
  part: BoundaryPart;
}

/** `LocalDate` → FullDay; `LocalDateTime` → Time (the time itself is dropped). */
export function normaliseBoundary(b: AbsenceBoundaryDto): NormalisedBoundary {
  switch (b.$type) {
    case 'LocalDatePart':
      return { date: b.date, part: b.datePart };
    case 'LocalDateTime':
      return { date: b.date, part: 'Time' };
    default:
      return { date: b.date, part: 'FullDay' };
  }
}

export interface NormalisedAbsence {
  absenceId: string;
  employeeId: string;
  brightHrType: string;
  displayName: string;
  start: NormalisedBoundary;
  end: NormalisedBoundary | null;
  durationDays: number | null;
  durationMinutes: number | null;
  /** Sickness only. Special category data: held in memory during the sync, never logged. */
  reason: string | null;
}

export function normaliseAbsence(dto: AbsenceDto): NormalisedAbsence {
  const sickness = isSicknessDto(dto) ? dto : null;
  const duration = sickness?.duration ?? null;
  return {
    absenceId: dto.id,
    employeeId: dto.employeeId,
    brightHrType: dto.$type,
    displayName: dto.displayName,
    start: normaliseBoundary(dto.start),
    end: dto.end ? normaliseBoundary(dto.end) : null,
    durationDays: duration?.$type === 'Days' ? duration.days : null,
    durationMinutes: duration?.$type === 'Minutes' ? duration.minutes : null,
    reason: sickness?.reason?.description ?? null,
  };
}
