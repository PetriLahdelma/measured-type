/**
 * APCA lightness contrast (Lc), APCA-W3 0.0.98G-4g constants. WCAG 2's ratio
 * ignores weight and size; Lc is read against a weight and size table, so a
 * thin weight that passes 4.5:1 can still be reported as hard to read.
 *
 *   node scripts/apca.js '#888' '#fff'        # Lc 63.1 (text colour, then background)
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

// #rgb or #rrggbb to [r, g, b], or null.
function hex(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(String(value).trim());
  if (!m) return null;
  const h = m[1].length === 3 ? [...m[1]].map((c) => c + c).join('') : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

if (require.main === module) {
  const [text, background] = process.argv.slice(2).map(hex);
  if (process.argv.length !== 4 || !text || !background) {
    console.error('usage: node scripts/apca.js TEXT BACKGROUND   (hex colours, for example #888 #fff)');
    process.exit(2);
  }
  const lc = apcaLc(text, background);
  console.log(`Lc ${lc.toFixed(1)} (${lc >= 0 ? 'dark text on a light ground' : 'light text on a dark ground'}); read it against the weight and size table in references/screen-and-ui.md`);
}

module.exports = { apcaLc };
