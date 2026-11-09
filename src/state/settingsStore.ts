import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import {
  DEFAULT_ACTIVE_END,
  DEFAULT_ACTIVE_START,
  DEFAULT_GOAL_CUPS,
  DEFAULT_INTERVAL,
  IntervalMinutes,
  MAX_GOAL_CUPS,
  MIN_GOAL_CUPS,
} from '../config';
import { CalculatorInput } from '../domain/waterCalculator';
import { ReminderSettings, clampWindow } from '../scheduling/buildSchedule';
import { deviceStorage } from './storage';

export interface SettingsState extends ReminderSettings {
  dailyGoal: number;
  onboarded: boolean;
  /** Set when the last window/interval change had to be shortened. */
  windowWasClamped: boolean;
  /** Last water-calculator answers, kept on this device only (never synced). */
  calculatorProfile: CalculatorInput | null;

  setEnabled: (enabled: boolean) => void;
  setInterval: (interval: IntervalMinutes) => void;
  setActiveWindow: (startMin: number, endMin: number) => void;
  setDailyGoal: (goal: number) => void;
  pauseUntil: (until: number) => void;
  resume: () => void;
  completeOnboarding: () => void;
  setCalculatorProfile: (profile: CalculatorInput) => void;
}

export const useSettings = create<SettingsState>()(
  persist(
    (set, get) => ({
      enabled: true,
      intervalMinutes: DEFAULT_INTERVAL,
      activeStartMin: DEFAULT_ACTIVE_START,
      activeEndMin: DEFAULT_ACTIVE_END,
      pausedUntil: null,
      dailyGoal: DEFAULT_GOAL_CUPS,
      onboarded: false,
      windowWasClamped: false,
      calculatorProfile: null,

      setEnabled: (enabled) => set({ enabled, pausedUntil: null }),
      setInterval: (intervalMinutes) => {
        const w = clampWindow(get().activeStartMin, get().activeEndMin, intervalMinutes);
        set({ intervalMinutes, activeStartMin: w.activeStartMin, activeEndMin: w.activeEndMin, windowWasClamped: w.clamped });
      },
      setActiveWindow: (startMin, endMin) => {
        const w = clampWindow(startMin, endMin, get().intervalMinutes);
        set({ activeStartMin: w.activeStartMin, activeEndMin: w.activeEndMin, windowWasClamped: w.clamped });
      },
      setDailyGoal: (goal) =>
        set({ dailyGoal: Math.max(MIN_GOAL_CUPS, Math.min(MAX_GOAL_CUPS, Math.round(goal))) }),
      pauseUntil: (until) => set({ pausedUntil: until, enabled: true }),
      resume: () => set({ pausedUntil: null }),
      completeOnboarding: () => set({ onboarded: true }),
      setCalculatorProfile: (calculatorProfile) => set({ calculatorProfile }),
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
        onboarded,
        calculatorProfile,
      }) => ({
        enabled,
        intervalMinutes,
        activeStartMin,
        activeEndMin,
        pausedUntil,
        dailyGoal,
        onboarded,
        calculatorProfile,
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
