import { friendlyError } from '../account';

jest.mock('@react-native-async-storage/async-storage', () =>
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);
jest.mock('expo-crypto', () => ({ randomUUID: () => '00000000-0000-4000-8000-000000000000' }));

describe('friendlyError', () => {
  it('explains when the sign-in email could not be sent', () => {
    expect(friendlyError({ message: 'Error sending magic link email', status: 500 })).toMatch(/couldn’t send the email/);
    expect(friendlyError({ message: 'Error sending confirmation email', status: 500 })).toMatch(/couldn’t send the email/);
  });

  it('treats rate limits as "too many attempts"', () => {
    expect(friendlyError({ message: 'email rate limit exceeded', code: 'over_email_send_rate_limit', status: 429 })).toMatch(
      /Too many attempts/,
    );
    expect(friendlyError({ message: 'Request rate limit reached', code: 'over_request_rate_limit', status: 429 })).toMatch(
      /Too many attempts/,
    );
  });

  it('keeps the Stanford-only and expired-code messages', () => {
    expect(friendlyError({ message: 'Database error saving new user' })).toMatch(/stanford\.edu/);
    expect(friendlyError({ message: 'Token has expired or is invalid', code: 'otp_expired' })).toMatch(/expired/);
  });
});
