import { MIN_SCALE, buddyState } from '../buddy';

describe('buddyState', () => {
  it('starts small, nearly empty and thirsty', () => {
    expect(buddyState(0, 8)).toMatchObject({ mood: 'thirsty', scale: MIN_SCALE, fill: 0.04 });
  });

  it('gets happier as cups are logged', () => {
    expect(buddyState(1, 8).mood).toBe('okay');
    expect(buddyState(3, 8).mood).toBe('okay');
    expect(buddyState(4, 8).mood).toBe('happy');
    expect(buddyState(7, 8).mood).toBe('happy');
    expect(buddyState(8, 8).mood).toBe('thrilled');
  });

  it('grows and fills steadily, reaching full size at the goal', () => {
    let last = buddyState(0, 8);
    for (let cups = 1; cups <= 8; cups++) {
      const s = buddyState(cups, 8);
      expect(s.scale).toBeGreaterThan(last.scale);
      expect(s.fill).toBeGreaterThan(last.fill);
      last = s;
    }
    expect(last.scale).toBeCloseTo(1);
    expect(last.fill).toBeCloseTo(1);
  });

  it('stays full size past the goal', () => {
    expect(buddyState(12, 8)).toMatchObject({ mood: 'thrilled', scale: 1, fill: 1, caption: 'Goal smashed! 💧' });
  });

  it('cheers for the last cup', () => {
    expect(buddyState(7, 8).caption).toBe('One more cup to go!');
  });

  it('handles odd goals safely', () => {
    expect(buddyState(3, 0).mood).toBe('okay');
    expect(buddyState(-1, 8).mood).toBe('thirsty');
  });
});
