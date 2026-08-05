// Words a title-cased augment-slot label keeps lower-case. Just the one today:
// "Isle of Dread" is the adventure pack's own spelling, and reading "Isle Of
// Dread" back to a player who knows the game is the giveaway that a machine
// wrote the label. No other label in the vocabulary contains a small word.
const LOWERCASE_WORDS = new Set(['of'])

/**
 * Display casing for a stored augment-slot label.
 *
 * `augment_slot_types.label` is lower-case because the pipeline matches it
 * against the wiki-sourced `augments.slot_color` when backfilling the FK, so
 * presentation casing is applied here rather than in the pipeline — the stored
 * string has to keep matching byte for byte.
 *
 * Own module (not a component-file export) so react-refresh stays happy, the
 * same reason `formatSigned` has one.
 */
export function formatSlotLabel(label: string): string {
  return label
    .split(' ')
    .map((word, i) =>
      i > 0 && LOWERCASE_WORDS.has(word)
        ? word
        : // The first *letter*, not the first character: the qualifier arrives
          // parenthesised, so "(legendary)" has to become "(Legendary)".
          word.replace(/[a-z]/, (letter) => letter.toUpperCase()),
    )
    .join(' ')
}
