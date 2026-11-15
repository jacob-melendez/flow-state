import { CHECK_IN_MESSAGES, REMINDER_MESSAGE, messageFor } from '../messages';

describe('notification messages', () => {
  it('uses the same title-only message for every reminder slot', () => {
    for (let slot = 0; slot < 60; slot++) {
      expect(messageFor('reminder', slot)).toEqual({ title: 'Take a Drink of Water💧' });
    }
    expect(REMINDER_MESSAGE.body).toBeUndefined();
  });

  it('keeps separate catch-up copy for check-ins', () => {
    expect(messageFor('checkin', 0).title).toBe('Time to catch up on water 🌊');
    expect(messageFor('checkin', 1)).toBe(CHECK_IN_MESSAGES[1]);
    expect(messageFor('checkin', 0).body).toBeTruthy();
  });
});
