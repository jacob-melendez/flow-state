/**
 * Reminder copy. Each time of day gets a stable message (rotated by slot
 * index) so students see variety through the day.
 */
export interface ReminderMessage {
  title: string;
  body: string;
}

export const REMINDER_MESSAGES: ReminderMessage[] = [
  { title: 'Time for some water 💧', body: 'Take a few sips. Your focus will thank you.' },
  { title: 'Hydration check', body: 'When did you last drink water? Grab a cup now.' },
  { title: 'Refill break 🚰', body: 'Top up your bottle at the nearest refill station.' },
  { title: 'Stay in flow', body: 'A glass of water helps keep your energy steady.' },
  { title: 'Quick sip?', body: 'Thirst often shows up as tiredness. Drink a cup of water.' },
  { title: 'Water o’clock 🌊', body: 'Pause for a cup of water before your next task.' },
  { title: 'Bottle check', body: 'Is your bottle empty? Now is a great time to refill.' },
  { title: 'Small habit, big impact', body: 'One cup of water now keeps you on track for your goal.' },
];

export function messageForSlot(slotIndex: number): ReminderMessage {
  return REMINDER_MESSAGES[slotIndex % REMINDER_MESSAGES.length];
}

/** Catch-up check-ins: only sent when the student is behind for this time of day. */
export const CHECK_IN_MESSAGES: ReminderMessage[] = [
  { title: 'Time to catch up on water 💧', body: 'You’re a bit behind for today. Try to catch up with a cup or two.' },
  { title: 'Water check-in', body: 'You’re behind on water for this time of day. A couple of cups will get you back on track.' },
];

export function messageFor(kind: 'reminder' | 'checkin', index: number): ReminderMessage {
  return kind === 'checkin' ? CHECK_IN_MESSAGES[index % CHECK_IN_MESSAGES.length] : messageForSlot(index);
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
