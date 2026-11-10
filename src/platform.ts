import { Platform } from 'react-native';

/**
 * Reminders are scheduled by the phone itself, so they exist only in the iOS
 * and Android apps. The website is a companion: logging, goal, streaks,
 * calculator, account and friends, but no reminders.
 */
export const supportsReminders = Platform.OS !== 'web';

export const isWeb = Platform.OS === 'web';
