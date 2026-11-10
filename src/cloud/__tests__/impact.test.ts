import { useLog } from '../../state/logStore';
import { useSettings } from '../../state/settingsStore';
import { ReportUsage, reportImpactStats } from '../impact';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({ randomUUID: () => 'install-1234' }));
jest.mock('expo-constants', () => ({ __esModule: true, default: { expoConfig: { version: '2.0.0' } } }));

const at = (y: number, mo: number, d: number, h = 12) => new Date(y, mo - 1, d, h).getTime();
const NOW = at(2026, 11, 12, 9);

function setup({ share = true, reportedThrough = null as string | null } = {}) {
  useLog.setState({ entries: [], goalByDay: {} });
  useSettings.setState({ shareImpactStats: share, installId: null, impactReportedThrough: reportedThrough, dailyGoal: 8 });
  const log = useLog.getState();
  for (let i = 0; i < 9; i++) log.logCup(8, at(2026, 11, 11, 10) + i);
  for (let i = 0; i < 2; i++) log.logCup(8, at(2026, 11, 12, 8) + i); // today: not reported yet
}

function fakeReporter(fail = false) {
  const calls: Parameters<ReportUsage>[0][] = [];
  const reporter: ReportUsage = async (args) => {
    calls.push(args);
    return { error: fail ? new Error('offline') : null };
  };
  return { calls, reporter };
}

describe('reportImpactStats', () => {
  it('sends yesterday with a random install id (no account), then remembers it', async () => {
    setup();
    const { calls, reporter } = fakeReporter();
    await reportImpactStats(reporter, NOW);
    expect(calls).toEqual([
      { p_install_id: 'install-1234', p_local_date: '2026-11-11', p_cups: 9, p_goal: 8, p_app_version: '2.0.0', p_platform: 'ios' },
    ]);
    expect(useSettings.getState().impactReportedThrough).toBe('2026-11-11');

    await reportImpactStats(reporter, NOW + 3600_000);
    expect(calls).toHaveLength(1); // nothing new until tomorrow
  });

  it('sends nothing when the student turned stats off', async () => {
    setup({ share: false });
    const { calls, reporter } = fakeReporter();
    await reportImpactStats(reporter, NOW);
    expect(calls).toEqual([]);
    expect(useSettings.getState().installId).toBeNull();
  });

  it('retries next time if sending fails', async () => {
    setup();
    const failing = fakeReporter(true);
    await reportImpactStats(failing.reporter, NOW);
    expect(useSettings.getState().impactReportedThrough).toBeNull();
    const ok = fakeReporter();
    await reportImpactStats(ok.reporter, NOW);
    expect(ok.calls).toHaveLength(1);
  });

  it('does nothing without a backend', async () => {
    setup();
    await expect(reportImpactStats(null, NOW)).resolves.toBeUndefined();
  });
});
