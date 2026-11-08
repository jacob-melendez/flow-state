import { create } from 'zustand';

import { PermissionState, getPermission, requestPermission } from '../notifications/adapter';
import { syncReminders } from '../sync';

interface PermissionStore {
  permission: PermissionState | null;
  refresh: () => Promise<PermissionState>;
  request: () => Promise<PermissionState>;
}

/** Notification permission, refreshed whenever the app returns to the foreground. */
export const usePermission = create<PermissionStore>()((set) => ({
  permission: null,
  refresh: async () => {
    const permission = await getPermission();
    set({ permission });
    return permission;
  },
  request: async () => {
    const permission = await requestPermission();
    set({ permission });
    await syncReminders();
    return permission;
  },
}));
