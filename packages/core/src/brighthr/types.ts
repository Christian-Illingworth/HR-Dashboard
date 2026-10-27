// BrightHR Customer API v1 types, for the subset this project reads.
// Source: https://docs.bright.hr/_bundle/api/customer-api-v1.yaml (v1.0.373554), as recorded in
// specs/001-hr-dashboard/contracts/brighthr-consumed.md. Fields the normaliser drops are still
// typed here, so the allow-list in normalise.ts is explicit about what it leaves out.

export type IsoDate = string; // YYYY-MM-DD
export type IsoTime = string; // HH:mm[:ss]

export interface ListResponse<T> {
  items: T[];
  continuationToken?: string | null;
}

export interface EmployeeDto {
  id: string;
  name: { givenName: string; familyName: string };
  employment: {
    jobTitle: string | null;
    start: IsoDate | null;
    end: IsoDate | null;
    payrollNumber: string | null;
  };
  email: string;
  externalReference: string | null;
  _metadata: { isRegistered: boolean; isTerminated: boolean };
}

export type DatePart = 'FirstHalf' | 'SecondHalf' | 'FullDay';

export type AbsenceBoundaryDto =
  | { $type: 'LocalDate'; date: IsoDate }
  | { $type: 'LocalDateTime'; date: IsoDate; time: IsoTime }
  | { $type: 'LocalDatePart'; date: IsoDate; datePart: DatePart };

export type DurationDto = { $type: 'Days'; days: number } | { $type: 'Minutes'; minutes: number };

export interface SicknessReasonDto {
  id: number;
  description: string;
}

interface AbsenceBase {
  id: string;
  employeeId: string;
  start: AbsenceBoundaryDto;
  end: AbsenceBoundaryDto | null;
  displayName: string;
  note?: string | null;
}

export interface HolidayAbsenceDto extends AbsenceBase {
  $type: 'Holiday';
}
export interface ToilAbsenceDto extends AbsenceBase {
  $type: 'Toil';
}
export interface OtherAbsenceDto extends AbsenceBase {
  $type: 'Other';
}
export interface SicknessAbsenceDto extends AbsenceBase {
  $type: 'Sickness';
  reason: SicknessReasonDto;
  duration: DurationDto | null;
  estimatedReturn?: { date: IsoDate; time?: IsoTime | null } | null;
  isCertified?: boolean;
  isPaid?: boolean;
  paidDuration?: DurationDto | null;
}
/** A `$type` this project doesn't know. It is categorised as "other" (spec edge case). */
export interface UnknownAbsenceDto extends AbsenceBase {
  $type: string;
}

export type AbsenceDto =
  | HolidayAbsenceDto
  | ToilAbsenceDto
  | OtherAbsenceDto
  | SicknessAbsenceDto
  | UnknownAbsenceDto;

export function isSicknessDto(a: AbsenceDto): a is SicknessAbsenceDto {
  return a.$type === 'Sickness';
}
