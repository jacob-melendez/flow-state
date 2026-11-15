import {
  formatFriendCode,
  friendShareMessage,
  isValidFriendCode,
  normalizeFriendCode,
  resetWebInviteForTests,
  takeWebInviteCode,
  webInviteLink,
} from '../friendCode';

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
    expect(msg).not.toContain('https://');
  });

  it('adds a web link when the website address is known', () => {
    const msg = friendShareMessage('abcd-efgh', 'https://flowstate.example.org/');
    expect(msg).toContain('https://flowstate.example.org/?add=ABCDEFGH');
    expect(msg).toContain('flowstate://add-friend/ABCDEFGH');
  });
});

describe('web invite links', () => {
  beforeEach(resetWebInviteForTests);

  it('builds a home-page link with ?add=CODE', () => {
    expect(webInviteLink('k7mn-p2q9', 'https://flowstate.expo.app/')).toBe('https://flowstate.expo.app/?add=K7MNP2Q9');
  });

  it('reads the code once per page load', () => {
    expect(takeWebInviteCode('?add=k7mn-p2q9')).toBe('K7MNP2Q9');
    expect(takeWebInviteCode('?add=K7MNP2Q9')).toBeNull();
  });

  it('ignores missing or invalid codes', () => {
    expect(takeWebInviteCode('')).toBeNull();
    expect(takeWebInviteCode('?add=nope')).toBeNull();
    expect(takeWebInviteCode('?other=1')).toBeNull();
    expect(takeWebInviteCode('?add=K7MNP2Q9')).toBe('K7MNP2Q9');
  });
});
