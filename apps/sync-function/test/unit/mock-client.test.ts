// T099/T100: the mocks copy the documented BrightHR and Graph behaviour (contracts/brighthr-consumed.md).
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BrightHrError, fetchAllPages } from '../../src/brighthr/BrightHrClient';
import { MockBrightHrClient } from '../../src/brighthr/mockClient';
import { MockDirectoryClient } from '../../src/graph/mockDirectory';

const fixturesDir = resolve(__dirname, '../../../../fixtures');
const client = new MockBrightHrClient({ fixturesDir, now: () => '2026-10-27T10:30:00Z' });
const CHLOE = 'e0000000-0000-4000-8000-000000000003';
const BEN = 'e0000000-0000-4000-8000-000000000002';

describe('MockBrightHrClient: employees', () => {
  it('pages current and terminated employees with continuation tokens', async () => {
    const first = await client.queryEmployees({ isTerminated: false, pageSize: 4 });
    expect(first.items).toHaveLength(4);
    expect(first.continuationToken).toBeTruthy();
    const all = await fetchAllPages((token) => client.queryEmployees({ isTerminated: false, pageSize: 4, continuationToken: token }));
    expect(all).toHaveLength(15);
    const leavers = await fetchAllPages((token) => client.queryEmployees({ isTerminated: true, continuationToken: token }));
    expect(leavers.map((e) => e.name.familyName)).toEqual(['Kaur', 'Adeyemi', 'Castellano', 'Whitaker']);
  });

  it('rejects a page size over 100 with a 422 validation problem', async () => {
    await expect(client.queryEmployees({ isTerminated: false, pageSize: 101 })).rejects.toMatchObject({ status: 422 });
  });
});

describe('MockBrightHrClient: absences', () => {
  it('needs an employee ID (422)', async () => {
    const err = await client.queryAbsences({ from: '2026-10-01', to: '2026-10-31' }).catch((e) => e);
    expect(err).toBeInstanceOf(BrightHrError);
    expect(err).toMatchObject({ status: 422, problemType: 'https://docs.bright.hr/problems#field-validation' });
  });

  it('refuses a "from" more than 90 days before today (UTC), and allows exactly 90', async () => {
    await expect(client.queryAbsences({ employeeId: BEN, from: '2026-07-28' })).rejects.toMatchObject({ status: 422 });
    await expect(client.queryAbsences({ employeeId: BEN, from: '2026-07-29', to: '2026-10-27' })).resolves.toBeTruthy();
  });

  it('defaults from and to to today, and returns absences overlapping the range', async () => {
    const today = await client.queryAbsences({ employeeId: BEN });
    expect(today.items.map((a) => a.displayName)).toEqual(['Annual leave']); // 26–30 Oct covers today
    const range = await client.queryAbsences({ employeeId: BEN, from: '2026-09-01', to: '2026-10-27' });
    expect(range.items.map((a) => a.start.date)).toEqual(['2026-09-14', '2026-10-26']);
  });

  it('returns open-ended sickness and the full BrightHR shape, including fields we drop', async () => {
    const r = await client.queryAbsences({ employeeId: CHLOE, from: '2026-10-01', to: '2027-01-31' });
    expect(r.items[0]).toMatchObject({ $type: 'Sickness', end: null, note: 'Physio booked', reason: { description: 'Back pain' } });
  });
});

describe('MockDirectoryClient', () => {
  it('lists the synthetic Entra users', async () => {
    const users = await new MockDirectoryClient({ fixturesDir }).listUsers();
    expect(users.length).toBe(16);
    expect(users.find((u) => u.userPrincipalName === 'jacob.ferreira@consultiv.example')).toMatchObject({ mail: null, department: 'Operations' });
  });
});
