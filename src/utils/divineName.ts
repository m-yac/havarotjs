import { hebChars, punctuation, taamim, vowelsWithSheva } from "./regularExpressions";

const wordBoundary = `(?:[^${hebChars.source.slice(1, -1)}]|${punctuation.source})`;
const taamimOrMeteg = new RegExp(`[${taamim.source.slice(1, -1)}\\u05BD]`, "u");

/**
 * The form of the divine name (i.e. the tetragrammaton) that a word is
 *
 * @remarks
 * A form is distinguished by whether the name has a prefix (e.g. "לַֽיהוָ֖ה"), and by whether its niqqud indicate it is read as "Elohim" (e.g. "יְהוִ֑ה") rather than "Adonai" (e.g. "יְהוָ֥ה").
 */
export type DivineNameForm = {
  readonly withPrefix: boolean;
  readonly isElohim: boolean;
};

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

const cachedDivineNameRegExps: [RegExp | null, RegExp | null] = [null, null];

/**
 * Creates a regular expression matching a word which is the divine name, optionally prefixed
 *
 * @param isElohim whether to match the form read as "Elohim" (i.e. the waw is pointed with a hiriq), or the form read as "Adonai"
 * @returns a regular expression with the named capture groups: `leading` for any
 * non-Hebrew characters preceding the name, `prefix` for any prefixes, `yodNiqqud`
 * for the niqqud of the initial yod, and `taam1` through `taam4` for the taam on
 * each of the four consonants of the name
 *
 * @remarks
 * The word is assumed to be sequenced (see {@link Text}), so within a cluster a vowel always precedes a taam.
 */
function divineNameRegExp(isElohim: boolean): RegExp {
  const cached = cachedDivineNameRegExps[+isElohim];
  if (cached) {
    return cached;
  }

  // the name must begin the word, though it may be preceded by non-Hebrew
  // characters (e.g. an opening quotation mark) and by prefixes
  let sRe = `^(?<leading>${wordBoundary}*)`;
  // a prefix is one of a few set letters followed by an optional dagesh,
  // niqqud, and taamim
  sRe += "(?<prefix>(?:[בהוכלמ]\\u05BC?" + vowelsWithSheva.source + "?" + taamimOrMeteg.source + "?)+)?";

  // we capture the vowel under the first letter, and all taamim
  sRe += "י(?<yodNiqqud>" + vowelsWithSheva.source + ")?(?<taam1>" + taamimOrMeteg.source + ")?";
  sRe += "ה" + vowelsWithSheva.source + "?(?<taam2>" + taamimOrMeteg.source + ")?";
  sRe += "ו" + (isElohim ? "ִ" : "ָ?") + "(?<taam3>" + taamimOrMeteg.source + ")?";
  sRe += "ה" + vowelsWithSheva.source + "?(?<taam4>" + taamimOrMeteg.source + ")?";

  // ensure this name ends the word
  sRe += `(?=$|${wordBoundary})`;

  const re = new RegExp(sRe, "u");
  cachedDivineNameRegExps[+isElohim] = re;
  return re;
}

/**
 * Matches a word against each form of the divine name
 *
 * @param word a sequenced word (see {@link Text})
 * @returns the match and the form matched, or `null` if the word is not a form of the divine name
 */
function matchDivineName(word: string): { match: RegExpExecArray; form: DivineNameForm } | null {
  for (const isElohim of [false, true]) {
    const match = divineNameRegExp(isElohim).exec(word);
    if (match) {
      return { match, form: { withPrefix: !!match.groups?.prefix, isElohim } };
    }
  }
  return null;
}

/**
 * Gets the form of the divine name (tetragrammaton) that a word is, if any
 *
 * @param word a sequenced word (see {@link Text})
 * @returns the form of the divine name the word is, or `null` if the word is not a form of the divine name
 *
 * @example
 * ```ts
 * divineNameForm("לַֽיהוָ֖ה");
 * // { withPrefix: true, isElohim: false }
 * divineNameForm("יְהוִ֑ה");
 * // { withPrefix: false, isElohim: true }
 * divineNameForm("אֶ֫רֶץ");
 * // null
 * ```
 */
export function divineNameForm(word: string): DivineNameForm | null {
  return matchDivineName(word)?.form ?? null;
}

/**
 * On a sequenced word (see {@link Text}), replaces the divine name (tetragrammaton) with a substitution, by default either "Adonai" or "Elohim" depending on the niqqud
 *
 * @param word a sequenced word
 * @param repl the replacement to use, {@link adonaiOrElohim} by default (see also {@link doubleYod} and {@link hashem})
 * @param form an optional argument for which form of the divine name to replace - any form is replaced if not given
 * @returns the word with the divine name replaced, or the word unchanged if it is not a form of the divine name (or not the given form)
 *
 * @remarks
 * The taamim are kept, being placed on the corresponding clusters of the replacement - see {@link DivineNameReplacement}.
 */
export function replaceDivineName(
  word: string,
  repl: DivineNameReplacement = adonaiOrElohim,
  form?: DivineNameForm
): string {
  const matched = matchDivineName(word);
  if (!matched) {
    return word;
  }

  const { match, form: matchedForm } = matched;
  if (form && (form.withPrefix !== matchedForm.withPrefix || form.isElohim !== matchedForm.isElohim)) {
    return word;
  }

  const groups = match.groups ?? {};
  const entry = matchedForm.isElohim ? repl.elohim : repl.adonai;
  // when the name is prefixed and the initial yod has no niqqud, the second string
  // of the first entry is used - e.g. "לַֽיהוָ֖ה" becomes "לַֽאדֹנָ֖י", not "לַֽאֲדֹנָ֖י"
  const prefixedFormIdx = matchedForm.withPrefix && !groups.yodNiqqud ? 1 : 0;
  let r = entry[0][prefixedFormIdx] + (groups.taam1 ?? "");
  r += entry[1] + (groups.taam2 ?? "");
  r += entry[2] + (groups.taam3 ?? "");
  r += entry[3] + (groups.taam4 ?? "");

  const start = match.index + (groups.leading?.length ?? 0) + (groups.prefix?.length ?? 0);
  const end = match.index + match[0].length;
  return word.slice(0, start) + r + word.slice(end);
}
