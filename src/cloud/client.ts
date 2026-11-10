/**
 * The Supabase client, or null when the app is built without a backend
 * (no EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_KEY). With no backend,
 * the app runs fully offline exactly like v1.
 */
import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { SupabaseClient, createClient } from '@supabase/supabase-js';
import { AppState, Platform } from 'react-native';

const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
const key = process.env.EXPO_PUBLIC_SUPABASE_KEY;

export const supabase: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: {
          storage: AsyncStorage,
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: false,
        },
      })
    : null;

export const cloudEnabled = supabase !== null;

/**
 * A second client that never signs in, used only for anonymous impact stats so
 * those requests can't be tied to the student's account.
 */
export const anonymousClient: SupabaseClient | null =
  url && key
    ? createClient(url, key, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'flow-state-anonymous' },
      })
    : null;

// Refresh the login token only while the app is in the foreground (Supabase's
// recommended setup for React Native).
if (supabase && Platform.OS !== 'web') {
  AppState.addEventListener('change', (state) => {
    if (state === 'active') supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
}
