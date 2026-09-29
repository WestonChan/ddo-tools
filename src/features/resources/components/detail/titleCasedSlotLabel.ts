const WORDS_KEPT_LOWERCASE = new Set(['of'])

export function titleCasedSlotLabel(label: string): string {
  return label
    .split(' ')
    .map((word, i) =>
      i > 0 && WORDS_KEPT_LOWERCASE.has(word)
        ? word
        : word.replace(/[a-z]/, (letter) => letter.toUpperCase()),
    )
    .join(' ')
}
