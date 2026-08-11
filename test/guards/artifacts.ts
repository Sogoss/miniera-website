/* Rule 8: nothing from the Claude Design runtime may ship.
 *
 * The files in design-export/ are the specification to translate, not code to
 * reuse. If one of these markers reaches dist/ it means a chunk of the export
 * was pasted in rather than rewritten.
 */
import { type Violation, lineNumber } from './types.ts';

/* Matched as tag openings rather than bare substrings on purpose: the hashed
 * filenames under dist/_astro/ would produce a naked "sc-if" by accident.
 * `DCLogic` and the two script filenames are distinctive enough on their own. */
const MARKERS: { pattern: RegExp; label: string }[] = [
  { pattern: /<\/?x-dc\b/gi, label: '<x-dc>' },
  { pattern: /<\/?sc-for\b/gi, label: '<sc-for>' },
  { pattern: /<\/?sc-if\b/gi, label: '<sc-if>' },
  { pattern: /<\/?x-import\b/gi, label: '<x-import>' },
  { pattern: /<\/?image-slot\b/gi, label: '<image-slot>' },
  { pattern: /\bDCLogic\b/g, label: 'DCLogic' },
  { pattern: /\bsupport\.js\b/g, label: 'support.js' },
  { pattern: /\bimage-slot\.js\b/g, label: 'image-slot.js' },
];

export function checkDesignRuntimeArtifacts(
  text: string,
  path: string,
): Violation[] {
  const violations: Violation[] = [];

  for (const { pattern, label } of MARKERS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      violations.push({
        rule: 'rule 8',
        detail: `\`${label}\` in ${path} on line ${lineNumber(text, match.index)}: the Claude Design runtime must not ship`,
      });
    }
  }

  return violations;
}
