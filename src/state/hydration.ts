import { useEffect, useState } from 'react';

import { useLog } from './logStore';
import { useSettings } from './settingsStore';

const stores = [useSettings, useLog];

function allHydrated(): boolean {
  return stores.every((s) => s.persist.hasHydrated());
}

/** Resolves once both persisted stores have loaded from device storage. */
export function waitForHydration(): Promise<void> {
  if (allHydrated()) return Promise.resolve();
  return new Promise((resolve) => {
    const unsubs = stores.map((s) =>
      s.persist.onFinishHydration(() => {
        if (allHydrated()) {
          unsubs.forEach((u) => u());
          resolve();
        }
      }),
    );
    // Hydration may have finished between the check and subscribing.
    if (allHydrated()) {
      unsubs.forEach((u) => u());
      resolve();
    }
  });
}

export function useHydrated(): boolean {
  const [hydrated, setHydrated] = useState(allHydrated);
  useEffect(() => {
    let active = true;
    waitForHydration().then(() => active && setHydrated(true));
    return () => {
      active = false;
    };
  }, []);
  return hydrated;
}
