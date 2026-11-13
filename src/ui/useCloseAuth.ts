import { router, useNavigation } from 'expo-router';
import { useCallback } from 'react';

/**
 * Closes the whole sign-in modal (app/auth) and returns to the screen that
 * opened it. `router.dismissAll()` only pops back to the first auth screen
 * (sign-in), which sent students round in a loop after adding their name.
 */
export function useCloseAuth(): () => void {
  const navigation = useNavigation();
  return useCallback(() => {
    // The auth screens live in their own stack; its parent is the root stack,
    // where the whole `auth` modal is a single route.
    const parent = navigation.getParent();
    if (parent?.canGoBack()) parent.goBack();
    else router.replace('/'); // e.g. the website was opened directly at /auth/...
  }, [navigation]);
}
