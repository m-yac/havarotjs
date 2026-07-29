import { hebChars, punctuation, taamim, vowelsWithSheva } from "./regularExpressions";

const wordBoundary = `(?:[^${hebChars.source.slice(1, -1)}]|${punctuation.source})`;
const taamimOrMeteg = new RegExp(`[${taamim.source.slice(1, -1)}\\u05BD]`, "u");

/**
 * A replacement for the divine name, given in two cases for each of the qere forms
 *
 * @remarks
 * For both forms, the replacement is an array of length four - with each entry being used to replace one of the four characters of the divine name.
 * The first entry is a pair of strings, the second one being used when the name is prefixed and the initial yod has no niqqud, and the first to use in all other cases; The remaining three entries are strings.
 * Note that although the taamim on the original name being replaced are kept after the replacement, the niqqud are not.
 * See {@link adonaiOrElohim} for an example.
 */
export type DivineNameReplacement = {
  adonai: [[string, string], string, string, string];
  elohim: [[string, string], string, string, string];
};

/**
 * Replaces the divine name with its qere, either "Adonai" or "Elohim" depending on the niqqud
 *
 * @example
 * ```ts
 * new Text("לַֽיהוָ֖ה").replaceDivineName(adonaiOrElohim).text;
 * // לַֽאדֹנָ֖י
 * new Text("יְהוִ֑ה").replaceDivineName(adonaiOrElohim).text;
 * // אֱלֹהִ֑ים
 * ```
 */
export const adonaiOrElohim: DivineNameReplacement = {
  adonai: [["אֲ", "א"], "דֹ", "נָ", "י"],
  elohim: [["אֱ", "א"], "לֹ", "הִ", "ים"]
};

/**
 * Replaces the divine name with two yods with the vowels of the qere
 *
 * @example
 * ```ts
 * new Text("יְהוָ֥ה").replaceDivineName(doubleYod).text;
 * // יְיָ֥
 * new Text("בַּֽיהוָ֑ה").replaceDivineName(doubleYod).text;
 * // בַּֽייָ֑
 * ```
 */
export const doubleYod: DivineNameReplacement = {
  adonai: [["יְ", "י"], "", "יָ", ""],
  elohim: [["יְ", "י"], "", "יִ", ""]
};

/**
 * Replaces the divine name with "Hashem" in all cases
 *
 * @example
 * ```ts
 * new Text("וַֽיהוָ֣ה").replaceDivineName(hashem).text;
 * // וַֽהַשֵּׁ֣ם
 * new Text("וְלַֽיהוָ֖ה").replaceDivineName(hashem).text;
 * // וְלַֽהַשֵּׁ֖ם
 * ```
 */
export const hashem: DivineNameReplacement = {
  adonai: [["הַ", "הַ"], "שֵּׁ", "", "ם"],
  elohim: [["הַ", "הַ"], "שֵּׁ", "", "ם"]
};

const cachedDivineNameRegExps: [RegExp | null, RegExp | null, RegExp | null, RegExp | null] = [null, null, null, null];

/**
 * Creates a regular expression matching one form of the divine name
 *
 * @param opts the form of the divine name to match
 * @returns a regular expression whose capture groups are the niqqud of the initial yod,
 * followed by the taam on each of the four consonants of the name
 *
 * @remarks
 * The text is assumed to be sequenced (see {@link Text}), so within a cluster a vowel always precedes a taam.
 */
function divineNameRegExp(opts: { readonly withPrefix: boolean; readonly isElohim: boolean }): RegExp {
  const i = (+opts.withPrefix << 1) | (+opts.isElohim << 0);
  if (cachedDivineNameRegExps[i]) {
    return cachedDivineNameRegExps[i];
  }

  // ensure this name begins a word, plus any prefixes if `withPrefix` is set
  let sRe = "(?<=(?:^|" + wordBoundary + ")";
  if (opts.withPrefix) {
    // a prefix is one of a few set letters followed by an optional dagesh,
    // niqqud, and taamim
    sRe += "(?:[בהוכלמ]\\u05BC?" + vowelsWithSheva.source + "?" + taamimOrMeteg.source + "?)+";
  }
  sRe += ")";

  // we capture the vowel under the first letter, and all taamim
  sRe += "י(" + vowelsWithSheva.source + ")?(" + taamimOrMeteg.source + ")?";
  sRe += "ה" + vowelsWithSheva.source + "?(" + taamimOrMeteg.source + ")?";
  sRe += "ו" + (opts.isElohim ? "ִ" : "ָ?") + "(" + taamimOrMeteg.source + ")?";
  sRe += "ה" + vowelsWithSheva.source + "?(" + taamimOrMeteg.source + ")?";

  // ensure this name ends a word
  sRe += `(?=$|${wordBoundary})`;

  const re = new RegExp(sRe, "gu");
  cachedDivineNameRegExps[i] = re;
  return re;
}

/**
 * On a sequenced string (see {@link Text}), replaces the divine name (tetragrammaton) with a substitution, by default either "Adonai" or "Elohim" depending on the niqqud
 *
 * @param s a sequenced string
 * @param repl the replacement to use, {@link adonaiOrElohim} by default (see also {@link doubleYod} and {@link hashem})
 * @param opts an optional argument for which form of the divine name to replace - all forms are replaced if not given
 * @returns the string with the divine name replaced
 *
 * @remarks
 * The taamim are kept, being placed on the corresponding clusters of the replacement - see {@link DivineNameReplacement}.
 */
export function replaceDivineName(
  s: string,
  repl: DivineNameReplacement = adonaiOrElohim,
  opts?: { readonly withPrefix: boolean; readonly isElohim: boolean }
): string {
  if (!opts) {
    s = replaceDivineName(s, repl, { withPrefix: true, isElohim: true });
    s = replaceDivineName(s, repl, { withPrefix: true, isElohim: false });
    s = replaceDivineName(s, repl, { withPrefix: false, isElohim: true });
    s = replaceDivineName(s, repl, { withPrefix: false, isElohim: false });
    return s;
  }
  const entry = opts.isElohim && "elohim" in repl ? repl.elohim : "adonai" in repl ? repl.adonai : repl;

  return s.replace(divineNameRegExp(opts), (_match, yodNiqqud?: string, ...taamim: (string | undefined)[]) => {
    const prefixedFormIdx = opts.withPrefix && !yodNiqqud ? 1 : 0;
    let r = entry[0][prefixedFormIdx] + (taamim[0] ?? "");
    r += entry[1] + (taamim[1] ?? "");
    r += entry[2] + (taamim[2] ?? "");
    r += entry[3] + (taamim[3] ?? "");
    return r;
  });
}
