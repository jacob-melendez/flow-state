import { formatFriendCode, friendShareMessage, isValidFriendCode, normalizeFriendCode } from '../friendCode';

describe('friend codes', () => {
  it('normalizes what students type', () => {
    expect(normalizeFriendCode(' abcd-efgh ')).toBe('ABCDEFGH');
    expect(normalizeFriendCode('ab cd ef gh')).toBe('ABCDEFGH');
  });

  it('validates length and alphabet', () => {
    expect(isValidFriendCode('ABCD-EFGH')).toBe(true);
    expect(isValidFriendCode('k7mn-p2q9')).toBe(true);
    expect(isValidFriendCode('ABCDEFG')).toBe(false);
    expect(isValidFriendCode('ABCDEFGHJ')).toBe(false);
    expect(isValidFriendCode('ABCDEFG0')).toBe(false); // 0 isn't used
    expect(isValidFriendCode('ABCDEFGI')).toBe(false); // I isn't used
  });

  it('formats for display', () => {
    expect(formatFriendCode('abcdefgh')).toBe('ABCD-EFGH');
    expect(formatFriendCode('ABC')).toBe('ABC');
  });

  it('builds a share message with the code and an invite link', () => {
    const msg = friendShareMessage('abcdefgh');
    expect(msg).toContain('ABCD-EFGH');
    expect(msg).toContain('flowstate://add-friend/ABCDEFGH');
  });
});
