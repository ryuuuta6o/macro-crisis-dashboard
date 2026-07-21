const URL_PATTERN = /https?:\/\/[^\s]+/giu;
const URL_WEIGHT = 23;

function codePointWeight(codePoint: number) {
  return (
    (codePoint >= 0 && codePoint <= 4351) ||
    (codePoint >= 8192 && codePoint <= 8205) ||
    (codePoint >= 8208 && codePoint <= 8223) ||
    (codePoint >= 8242 && codePoint <= 8247)
  ) ? 1 : 2;
}

export function getXWeightedLength(text: string) {
  let total = 0;
  let cursor = 0;
  for (const match of text.matchAll(URL_PATTERN)) {
    const index = match.index ?? 0;
    for (const character of text.slice(cursor, index)) {
      total += codePointWeight(character.codePointAt(0) ?? 0);
    }
    total += URL_WEIGHT;
    cursor = index + match[0].length;
  }
  for (const character of text.slice(cursor)) {
    total += codePointWeight(character.codePointAt(0) ?? 0);
  }
  return total;
}

export function isValidXText(text: string) {
  const length = getXWeightedLength(text.trim());
  return text.trim().length > 0 && length <= 280;
}

