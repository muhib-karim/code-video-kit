/**
 * Text helpers shared by components; not part of the public API.
 *
 * Typing animations count in UTF-16 units (so durations match `string.length`),
 * but a string cut between the two halves of a surrogate pair renders as
 * U+FFFD. These helpers keep astral characters such as emoji whole.
 */

/**
 * First `count` UTF-16 units of `text`, stopping one unit early when the cut
 * would land inside a surrogate pair.
 */
export function sliceChars(text: string, count: number): string {
  const end = Math.max(0, Math.min(text.length, Math.floor(count)));
  if (end > 0 && end < text.length) {
    const before = text.charCodeAt(end - 1);
    const after = text.charCodeAt(end);
    const splitsPair = before >= 0xd800 && before <= 0xdbff && after >= 0xdc00 && after <= 0xdfff;
    if (splitsPair) return text.slice(0, end - 1);
  }
  return text.slice(0, end);
}

/** First whole character (code point) of `text`, or an empty string. */
export function firstChar(text: string): string {
  for (const ch of text) return ch;
  return '';
}
