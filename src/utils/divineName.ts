import { hebChars, punctuation, taamim, vowelsWithSheva } from "./regularExpressions";

const wordBoundary = `(?:[^${hebChars.source.slice(1, -1)}]|${punctuation.source})`;
const taamimOrMeteg = new RegExp(`[${taamim.source.slice(1, -1)}\\u05BD]`, "u");

/**
 * The form of the Divine Name (i.e. the tetragrammaton) that a word is
 *
 * @remarks
 * A form is distinguished by whether the name has a prefix (e.g. "לַֽיהוָ֖ה"), and by whether its niqqud indicate it is read as "Elohim" (e.g. "יְהוִ֑ה") rather than "Adonai" (e.g. "יְהוָ֥ה").
 */
export type DivineNameForm = {
  readonly withPrefix: boolean;
  readonly isElohim: boolean;
};

/**
 * A replacement for the Divine Name, given in two cases for each of the qere forms
 *
 * @remarks
 * For both forms, the replacement is an array of length four - with each entry being used to replace one of the four characters of the Divine Name.
 * The first entry is a pair of strings, the second one being used when the name is prefixed and the initial yod has no niqqud, and the first to use in all other cases; The remaining three entries are strings.
 * Note that although the taamim on the original name being replaced are kept after the replacement, the niqqud are not.
 * See {@link adonaiOrElohim} for an example.
 */
export type DivineNameReplacement = {
  adonai: [[string, string], string, string, string];
  elohim: [[string, string], string, string, string];
};

/**
 * Replaces the Divine Name with its qere, either "Adonai" or "Elohim" depending on the niqqud
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
 * Replaces the Divine Name with two yods with the vowels of the qere
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
 * Replaces the Divine Name with "Hashem" in all cases
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

// a prefix is one of a few set letters followed by an optional dagesh, niqqud, and taamim
const prefix = "[בהוכלמ]\\u05BC?" + vowelsWithSheva.source + "?" + taamimOrMeteg.source + "?";
const finalPrefix = new RegExp(`(?:${prefix})$`, "u");

const cachedDivineNameRegExps: [RegExp | null, RegExp | null] = [null, null];

/**
 * Creates a regular expression matching a word which is the Divine Name, optionally prefixed
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
  sRe += `(?<prefix>(?:${prefix})+)?`;

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
 * Matches a word against each form of the Divine Name
 *
 * @param word a sequenced word (see {@link Text})
 * @returns the match and the form matched, or `null` if the word is not a form of the Divine Name
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
 * Gets the form of the Divine Name (tetragrammaton) that a word is, if any
 *
 * @param word a sequenced word (see {@link Text})
 * @returns the form of the Divine Name the word is, or `null` if the word is not a form of the Divine Name
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
 * Gets the index in a word at which the syllable read as the Divine Name (tetragrammaton) begins
 *
 * @param word a sequenced word (see {@link Text})
 * @returns the index at which that syllable begins, or `null` if the word is not a form of the Divine Name
 *
 * @remarks
 * Note that when the initial yod of a prefixed name has no niqqud (e.g. "לַֽיהוָ֖ה"), the yod is then read with the final prefix - so the index of that prefix is returned.
 *
 * @example
 * ```ts
 * divineNameSyllableStart("וְלַֽיהוָ֖ה");
 * // 2, the index of the lamed
 * divineNameSyllableStart("וּמֵיְהוָ֖ה");
 * // 4, the index of the yod
 * ```
 */
export function divineNameSyllableStart(word: string): number | null {
  const matched = matchDivineName(word);
  if (!matched) {
    return null;
  }

  const groups = matched.match.groups ?? {};
  const prefix = groups.prefix ?? "";
  const start = matched.match.index + (groups.leading?.length ?? 0) + prefix.length;
  if (!prefix || groups.yodNiqqud) {
    return start;
  }
  // the yod has no niqqud, so it is read with the final prefix
  return start - (prefix.match(finalPrefix)?.[0].length ?? 0);
}

/**
 * On a syllable read as the Divine Name (tetragrammaton), replaces the name with a substitution, by default either "Adonai" or "Elohim" depending on the niqqud
 *
 * @param syllable the text of a syllable of a sequenced word (see {@link Text}) which is read as the Divine Name
 * @param repl the replacement to use, {@link adonaiOrElohim} by default (see also {@link doubleYod} and {@link hashem})
 * @returns the syllable with the Divine Name replaced, or the syllable unchanged if it is not read as the Divine Name
 *
 * @remarks
 * The name is read as a unit (see {@link divineNameSyllableStart}), so such a syllable is either the name alone (e.g. "יְהוָ֥ה") or the name preceded by the single prefix it is read with (e.g. "לַֽיהוָ֖ה") - and in the latter case the initial yod is always unpointed.
 * The taamim are kept, being placed on the corresponding clusters of the replacement - see {@link DivineNameReplacement}.
 */
export function replaceDivineName(syllable: string, repl: DivineNameReplacement = adonaiOrElohim): string {
  const matched = matchDivineName(syllable);
  if (!matched) {
    return syllable;
  }

  const { match, form } = matched;
  const groups = match.groups ?? {};
  const entry = form.isElohim ? repl.elohim : repl.adonai;
  // when the syllable is prefixed, the initial yod has no niqqud, so the
  // second string of the first entry is used - e.g. "לַֽיהוָ֖ה" becomes
  // "לַֽאדֹנָ֖י", not "לַֽאֲדֹנָ֖י"
  let r = entry[0][form.withPrefix ? 1 : 0] + (groups.taam1 ?? "");
  r += entry[1] + (groups.taam2 ?? "");
  r += entry[2] + (groups.taam3 ?? "");
  r += entry[3] + (groups.taam4 ?? "");

  const start = match.index + (groups.leading?.length ?? 0) + (groups.prefix?.length ?? 0);
  const end = match.index + match[0].length;
  return syllable.slice(0, start) + r + syllable.slice(end);
}
