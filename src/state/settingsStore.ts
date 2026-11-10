import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  DEFAULT_ACTIVE_END,
  DEFAULT_ACTIVE_START,
  DEFAULT_GOAL_CUPS,
  DEFAULT_INTERVAL,
  IMPACT_STATS_DEFAULT,
  IntervalMinutes,
  MAX_GOAL_CUPS,
  MIN_GOAL_CUPS,
} from '../config';
import { CalculatorInput } from '../domain/waterCalculator';
import { ReminderSettings, clampWindow } from '../scheduling/buildSchedule';
import { deviceStorage } from './storage';

export interface SettingsState extends ReminderSettings {
  dailyGoal: number;
  /** Epoch ms of the last goal change, so the goal syncs "newest wins". */
  dailyGoalUpdatedAt: number;
  onboarded: boolean;
  /** Set when the last window/interval change had to be shortened. */
  windowWasClamped: boolean;
  /** Last water-calculator answers, kept on this device only (never synced). */
  calculatorProfile: CalculatorInput | null;
  /** Anonymous impact stats: opt-out switch, random install id, last day reported. */
  shareImpactStats: boolean;
  installId: string | null;
  impactReportedThrough: string | null;

  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: IntervalMinutes) => void;
  setActiveWindow: (startMin: number, endMin: number) => void;
  setDailyGoal: (goal: number) => void;
  /** Applies a goal that came from the cloud without marking it as a new change. */
  applyRemoteGoal: (goal: number, updatedAt: number) => void;
  pauseUntil: (until: number) => void;
  resume: () => void;
  completeOnboarding: () => void;
  setCalculatorProfile: (profile: CalculatorInput) => void;
  setShareImpactStats: (share: boolean) => void;
}

const clampGoal = (goal: number) => Math.max(MIN_GOAL_CUPS, Math.min(MAX_GOAL_CUPS, Math.round(goal)));

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      enabled: true,
      intervalMinutes: DEFAULT_INTERVAL,
      activeStartMin: DEFAULT_ACTIVE_START,
      activeEndMin: DEFAULT_ACTIVE_END,
      pausedUntil: null,
      dailyGoal: DEFAULT_GOAL_CUPS,
      dailyGoalUpdatedAt: 0,
      onboarded: false,
      windowWasClamped: false,
      calculatorProfile: null,
      shareImpactStats: IMPACT_STATS_DEFAULT,
      installId: null,
      impactReportedThrough: null,

      setEnabled: (enabled) => set({ enabled, pausedUntil: null }),
      setInterval: (intervalMinutes) => {
        const w = clampWindow(get().activeStartMin, get().activeEndMin, intervalMinutes);
        set({ intervalMinutes, activeStartMin: w.activeStartMin, activeEndMin: w.activeEndMin, windowWasClamped: w.clamped });
      },
      setActiveWindow: (startMin, endMin) => {
        const w = clampWindow(startMin, endMin, get().intervalMinutes);
        set({ activeStartMin: w.activeStartMin, activeEndMin: w.activeEndMin, windowWasClamped: w.clamped });
      },
      setDailyGoal: (goal) => {
        const dailyGoal = clampGoal(goal);
        if (dailyGoal !== get().dailyGoal) set({ dailyGoal, dailyGoalUpdatedAt: Date.now() });
      },
      applyRemoteGoal: (goal, updatedAt) => set({ dailyGoal: clampGoal(goal), dailyGoalUpdatedAt: updatedAt }),
      pauseUntil: (until) => set({ pausedUntil: until, enabled: true }),
      resume: () => set({ pausedUntil: null }),
      completeOnboarding: () => set({ onboarded: true }),
      setCalculatorProfile: (calculatorProfile) => set({ calculatorProfile }),
      setShareImpactStats: (shareImpactStats) => set({ shareImpactStats }),
    }),
    {
      name: 'flow-state/settings',
      storage: deviceStorage,
      version: 1,
      partialize: ({
        enabled,
        intervalMinutes,
        activeStartMin,
        activeEndMin,
        pausedUntil,
        dailyGoal,
        dailyGoalUpdatedAt,
        onboarded,
        calculatorProfile,
        shareImpactStats,
        installId,
        impactReportedThrough,
      }) => ({
        enabled,
        intervalMinutes,
        activeStartMin,
        activeEndMin,
        pausedUntil,
        dailyGoal,
        dailyGoalUpdatedAt,
        onboarded,
        calculatorProfile,
        shareImpactStats,
        installId,
        impactReportedThrough,
      }),
      // Add cases here when the stored shape changes (e.g. accounts in v2).
      migrate: (persisted) => persisted as SettingsState,
    },
  ),
);

export function reminderSettingsOf(s: SettingsState): ReminderSettings {
  return {
    enabled: s.enabled,
    intervalMinutes: s.intervalMinutes,
    activeStartMin: s.activeStartMin,
    activeEndMin: s.activeEndMin,
    pausedUntil: s.pausedUntil,
  };
}
