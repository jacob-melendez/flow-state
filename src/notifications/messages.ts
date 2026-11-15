/**
 * Reminder copy. Every regular reminder is the same short notification, so it
 * stays simple and recognizable. Check-ins and safety warnings have their own copy.
 */
export interface ReminderMessage {
  title: string;
  body?: string;
}

export const REMINDER_MESSAGE: ReminderMessage = { title: 'Take a Drink of Water💧' };

/** Catch-up check-ins: only sent when the student is behind for this time of day. */
export const CHECK_IN_MESSAGES: ReminderMessage[] = [
  { title: 'Time to catch up on water 🌊', body: 'You’re a bit behind for today. Try to catch up with a cup or two.' },
  { title: 'Water check-in', body: 'You’re behind on water for this time of day. A couple of cups will get you back on track.' },
];

export function messageFor(kind: 'reminder' | 'checkin', index: number): ReminderMessage {
  return kind === 'checkin' ? CHECK_IN_MESSAGES[index % CHECK_IN_MESSAGES.length] : REMINDER_MESSAGE;
}

/** "Too much water" break messages (not medical advice). */
export const SAFETY_MESSAGES = {
  fast: {
    title: 'Take a break from water 🫧',
    body: 'That’s a lot of water in a short time. Pause for at least an hour and drink only when you’re thirsty.',
  },
  total: {
    title: 'You’ve had plenty today',
    body: 'You’re well past your daily need. Take a break and listen to your thirst. Feeling unwell? Talk to a clinician.',
  },
};
