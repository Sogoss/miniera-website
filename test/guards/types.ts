/* The shape every guard returns.
 *
 * A guard never returns a boolean. When one trips six months from now it has
 * to say *which* colour drifted and on what line, not "false". The `rule`
 * field cites the numbered rule in CLAUDE.md so whoever reads the CI failure
 * knows where the reasoning lives.
 */
export type Violation = {
  rule: string;
  detail: string;
};

/** 1-based line number of `index` within `text`. */
export function lineNumber(text: string, index: number): number {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}
