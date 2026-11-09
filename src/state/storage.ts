import AsyncStorage from '@react-native-async-storage/async-storage';
import { createJSONStorage } from 'zustand/middleware';

/** All app data is stored on-device only. */
export const deviceStorage = createJSONStorage(() => AsyncStorage);
