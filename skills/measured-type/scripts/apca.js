/**
 * APCA lightness contrast (Lc), APCA-W3 0.0.98G-4g constants. WCAG 2's ratio
 * ignores weight and size; Lc is read against a weight and size table, so a
 * thin weight that passes 4.5:1 can still be reported as hard to read.
 *
 *   const { apcaLc } = require('./apca.js');
 *   apcaLc([136, 136, 136], [255, 255, 255]); // 63.06, text on background
 *
 * Positive Lc is dark text on a light ground, negative is light on dark.
 */

const Y = ([r, g, b]) => 0.2126729 * (r / 255) ** 2.4 + 0.7151522 * (g / 255) ** 2.4 + 0.072175 * (b / 255) ** 2.4;

function apcaLc(text, background) {
  const soft = (y) => (y > 0.022 ? y : y + (0.022 - y) ** 1.414);
  const t = soft(Y(text));
  const b = soft(Y(background));
  if (Math.abs(b - t) < 0.0005) return 0;
  if (b > t) {
    const s = (b ** 0.56 - t ** 0.57) * 1.14;
    return s < 0.1 ? 0 : (s - 0.027) * 100;
  }
  const s = (b ** 0.65 - t ** 0.62) * 1.14;
  return s > -0.1 ? 0 : (s + 0.027) * 100;
}

module.exports = { apcaLc };
