import { QR_MARGIN, qrShape } from '../qr';

describe('qrShape', () => {
  it('draws a square code with a quiet-zone margin', () => {
    const { size, path } = qrShape('https://flowstate.expo.app/?add=K7MNP2Q9');
    // Version 3 (29 modules) or so for a short URL, plus the margin on both sides.
    expect(size).toBeGreaterThanOrEqual(21 + QR_MARGIN * 2);
    expect(path.startsWith(`M${QR_MARGIN} ${QR_MARGIN}h1v1h-1z`)).toBe(true); // finder pattern corner is dark
    expect(path).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });

  it('is deterministic and changes with the text', () => {
    expect(qrShape('ABC').path).toBe(qrShape('ABC').path);
    expect(qrShape('https://a.example/?add=AAAAAAAA').path).not.toBe(qrShape('https://a.example/?add=BBBBBBBB').path);
  });
});
