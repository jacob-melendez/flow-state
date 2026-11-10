/**
 * Anonymous impact stats for SENSA's reports: once a day, send totals for
 * recent completed days (see src/domain/impact.ts for which days). Works whether
 * or not the student is signed in, and never sends their login.
 * Does nothing when the student turned it off or no backend is configured.
 */
import Constants from 'expo-constants';
import { randomUUID } from 'expo-crypto';
import { Platform } from 'react-native';

import { IMPACT_LOOKBACK_DAYS } from '../config';
import { daysToReport, lastCompletedDay } from '../domain/impact';
import { countsByDay } from '../domain/streaks';
import { waitForHydration } from '../state/hydration';
import { useLog } from '../state/logStore';
import { useSettings } from '../state/settingsStore';
import { anonymousClient } from './client';

export type ReportUsage = (args: {
  p_install_id: string;
  p_local_date: string;
  p_cups: number;
  p_goal: number;
  p_app_version: string;
  p_platform: string;
}) => Promise<{ error: unknown }>;

function makeReporter(): ReportUsage | null {
  const client = anonymousClient;
  if (!client) return null;
  return async (args) => {
    const { error } = await client.rpc('report_usage', args);
    return { error };
  };
}
const defaultReporter = makeReporter();

let running: Promise<void> | null = null;

/** Sends any unreported days. Safe to call often; at most one run at a time. */
export function reportImpactStats(reporter: ReportUsage | null = defaultReporter, now = Date.now()): Promise<void> {
  if (!reporter) return Promise.resolve();
  running ??= run(reporter, now).finally(() => {
    running = null;
  });
  return running;
}

async function run(reporter: ReportUsage, now: number): Promise<void> {
  await waitForHydration();
  const settings = useSettings.getState();
  if (!settings.shareImpactStats) return;
  if (Platform.OS !== 'ios' && Platform.OS !== 'android' && Platform.OS !== 'web') return;

  const through = lastCompletedDay(now);
  if (settings.impactReportedThrough !== null && settings.impactReportedThrough >= through) return;

  let installId = settings.installId;
  if (!installId) {
    installId = randomUUID();
    useSettings.setState({ installId });
  }

  const log = useLog.getState();
  const days = daysToReport(
    countsByDay(log.entries),
    log.goalByDay,
    settings.dailyGoal,
    settings.impactReportedThrough,
    now,
    IMPACT_LOOKBACK_DAYS,
  );

  for (const day of days) {
    try {
      const { error } = await reporter({
        p_install_id: installId,
        p_local_date: day.date,
        p_cups: day.cups,
        p_goal: day.goal,
        p_app_version: Constants.expoConfig?.version ?? 'unknown',
        p_platform: Platform.OS,
      });
      if (error) return; // try again next time (offline, or the stats SQL hasn't been run yet)
    } catch {
      return;
    }
  }
  useSettings.setState({ impactReportedThrough: through });
}
