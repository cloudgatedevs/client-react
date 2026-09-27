export const isHex = (value) => /^#[0-9a-f]{6}$/i.test(String(value || ''));
export const rgb = (hex) =>
  [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)).join(' ');
export const foreground = (hex) => {
  const channels = [1, 3, 5]
    .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
    .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722 >
    0.179
    ? '15 23 42'
    : '255 255 255';
};

/** Keep accent text readable on both workspace palettes, even with a pale brand colour. */
export function accentText(hex, dark) {
  const channels = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  const luminance = (rgb) =>
    rgb
      .map((v) => v / 255)
      .map((v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4))
      .reduce((n, v, i) => n + v * [0.2126, 0.7152, 0.0722][i], 0);
  const background = luminance(dark ? [17, 24, 39] : [255, 255, 255]);
  const target = dark ? 255 : 0;
  for (let step = 0; step <= 20; step++) {
    const adjusted = channels.map((v) =>
      Math.round(v + ((target - v) * step) / 20),
    );
    const light = luminance(adjusted);
    if (
      (Math.max(light, background) + 0.05) /
        (Math.min(light, background) + 0.05) >=
      4.5
    )
      return adjusted.join(' ');
  }
  return dark ? '255 255 255' : '0 0 0';
}
