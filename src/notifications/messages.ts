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
