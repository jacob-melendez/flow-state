import createQr from 'qrcode-generator';

export interface QrShape {
  /** Modules per side, including the quiet-zone margin. */
  size: number;
  /** One SVG path covering every dark module, in module units. */
  path: string;
}

/** Light modules kept around the code; scanners need a clear border. */
export const QR_MARGIN = 2;

/**
 * Turns text (e.g. an invite link) into a QR code drawn as a single SVG path.
 * Error correction "M" survives a bit of glare on a projector or phone screen.
 */
export function qrShape(text: string): QrShape {
  const qr = createQr(0, 'M');
  qr.addData(text);
  qr.make();
  const count = qr.getModuleCount();
  let path = '';
  for (let row = 0; row < count; row++) {
    for (let col = 0; col < count; col++) {
      if (qr.isDark(row, col)) path += `M${col + QR_MARGIN} ${row + QR_MARGIN}h1v1h-1z`;
    }
  }
  return { size: count + QR_MARGIN * 2, path };
}
