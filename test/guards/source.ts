/* Reading code without parsing it.
 *
 * The two functions every guard that looks at JavaScript or TypeScript needs
 * before it can believe what it has found: what is inside a string is not code,
 * and what is inside a comment is not code either. They live here rather than in
 * the file that first needed them because the second guard to need them would
 * otherwise have copied them — and a copy of this particular pair is worse than
 * most, since the way they fail is by quietly answering «nothing to see».
 */

/**
 * The source with the contents of its string literals blanked out — same
 * length, same lines, same offsets, so a match found in the original is at the
 * same index here.
 *
 * It exists for one reason: the glob a content collection is loaded with. Write
 * that glob out here and this comment ends in the middle of the sentence, which
 * is exactly the point — it carries a comment closer at its second character
 * and an opener at its third. The open-comment test below therefore found an
 * unclosed opener and declared everything after it commented out.
 * `src/content.config.ts` writes that glob four times, the first on line 31:
 * from there down, all three source guards returned `[]` for a file nobody had
 * exempted. A formatter without a zone, a `getHours()`, a `new Date()` — none
 * of them was being looked at, and the suite was green.
 *
 * Quotes are tracked one line at a time, so an apostrophe in Italian prose
 * blanks the rest of its own line and nothing more. This is still not a
 * comment extractor — the fragile thing decisioni.md keeps refusing to write —
 * and it does not need to be: blanking a string can only take comment markers
 * away, and every marker it takes away is one that was never a comment.
 */
export function maskStrings(source: string): string {
  const masked = [...source];
  let quote = '';

  for (let i = 0; i < source.length; i++) {
    const character = source[i];
    if (character === '\n') {
      quote = '';
      continue;
    }
    if (quote) {
      if (character === '\\') {
        masked[i] = ' ';
        if (source[i + 1] !== '\n') masked[i + 1] = ' ';
        i++;
        continue;
      }
      if (character === quote) quote = '';
      else masked[i] = ' ';
      continue;
    }
    if (character === '"' || character === "'" || character === '`') quote = character;
  }

  return masked.join('');
}

/** Whether `index` sits inside a comment.
 *
 *  Two shapes, both of them line-and-position work rather than parsing: an
 *  unclosed `/*` before it, and a `//` earlier on its own line. The second
 *  ignores the `//` of a URL, which is the one that turns up in prose. Takes
 *  the masked source, not the original: a comment marker written inside a
 *  string is not a comment, and one of those switched off three guards. */
export function inComment(masked: string, index: number): boolean {
  const opened = masked.lastIndexOf('/*', index);
  if (opened !== -1 && opened > masked.lastIndexOf('*/', index)) return true;

  const lineStart = masked.lastIndexOf('\n', index - 1) + 1;
  const before = masked.slice(lineStart, index);
  return /(^|[^:])\/\//.test(before) || /^\s*\*/.test(before);
}
