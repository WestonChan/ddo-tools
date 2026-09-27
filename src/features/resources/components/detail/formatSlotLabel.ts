const LOWERCASE_WORDS = new Set(['of'])

export function formatSlotLabel(label: string): string {
  return label
    .split(' ')
    .map((word, i) =>
      i > 0 && LOWERCASE_WORDS.has(word)
        ? word
        :
          word.replace(/[a-z]/, (letter) => letter.toUpperCase()),
    )
    .join(' ')
}
