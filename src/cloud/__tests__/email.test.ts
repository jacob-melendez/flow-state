import { completeStanfordEmail, isStanfordEmail } from '../email';

describe('isStanfordEmail', () => {
  it.each(['jdoe@stanford.edu', ' JDoe@Stanford.EDU ', 'first.last@stanford.edu'])('accepts %s', (e) => {
    expect(isStanfordEmail(e)).toBe(true);
  });

  it.each(['jdoe@gmail.com', 'jdoe@cs.stanford.edu', 'jdoe@stanford.edu.com', 'jdoe@notstanford.edu', '@stanford.edu', 'j doe@stanford.edu', ''])(
    'rejects %s',
    (e) => {
      expect(isStanfordEmail(e)).toBe(false);
    },
  );
});

describe('completeStanfordEmail', () => {
  it('adds the domain to a bare SUNet ID', () => {
    expect(completeStanfordEmail(' JDoe ')).toBe('jdoe@stanford.edu');
    expect(completeStanfordEmail('jdoe@stanford.edu')).toBe('jdoe@stanford.edu');
    expect(completeStanfordEmail('')).toBe('');
  });
});
