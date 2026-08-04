/* eslint-disable @typescript-eslint/no-unsafe-function-type */
import { Char } from "./char";
import { Syllable } from "./syllable";

/**
 * The type of {@link SyllablePart.kind}, pulled out for convenience
 */
export type SyllablePartKind = "consonant" | "vowel" | "hebrew mark" | "non-hebrew";

/**
 * A part of a {@link Syllable}, i.e. either a {@link Consonant}, a {@link Vowel}, {@link HebrewMark}, or a {@link NonHebrew} character.
 */
export abstract class SyllablePart {
  #chars: Char[];
  #syllable: Syllable;

  /**
   * A tag that indicates whether a {@link SyllablePart} is a {@link Consonant}, {@link Vowel}, {@link HebrewMark}, or {@link NonHebrew}
   *
   * @example
   * ```ts
   * const text: Text = new Text("בַּ֥ד.");
   * text.syllables[0].parts.map((p) => p.kind);
   * // ["consonant", "vowel", "hebrew mark", "consonant", "non-hebrew"]
   * ```
   */
  abstract readonly kind: SyllablePartKind;

  constructor(chars: Char[], syllable: Syllable) {
    this.#chars = chars;
    this.#syllable = syllable;
  }

  /**
   * Applies a {@link SyllablePartMap} to this {@link SyllablePart}, throwing an error if no match can be found
   *
   * @param map the {@link SyllablePartMap} to apply
   *
   * @returns the value returned by the appropriate call to {@link matchSyllablePart}
   */
  abstract apply<T>(map: SyllablePartMap<T>): T;

  /**
   * Gets all the {@link Char | Characters} in the syllable part
   *
   * @returns a one dimensional array of Chars
   *
   * @example
   * ```ts
   * const text: Text = new Text("שׁוּם");
   * text.syllables[0].parts[1].chars;
   * // [
   * //  Char { original: "ו" },
   * //  Char { original: "ּ " },   i.e. \u{05BC} (does not print well)
   * // ]
   * ```
   */
  get chars(): Char[] {
    return this.#chars;
  }

  /**
   * Gets the text of the syllable part
   *
   * @returns the syllable part's text
   *
   * @example
   * ```ts
   * const text: Text = new Text("שֶׁל");
   * text.syllables[0].parts[0].text;
   * // "שׁ"
   * ```
   */
  get text(): string {
    return this.chars.reduce((init, char) => init + char.text, "");
  }

  /**
   * Gets the {@link Syllable} to which the syllable part belongs
   *
   * @returns the `Syllable` to which the syllable part belongs
   *
   * @example
   * ```ts
   * const text: Text = new Text("דָּבָר");
   * const secondConsonant = text.syllables[1].parts[0];
   * secondConsonant.text;
   * // "ב"
   * secondConsonant.syllable?.text;
   * // "בָר"
   * ```
   */
  get syllable(): Syllable {
    return this.#syllable;
  }
}

/**
 * The type of {@link Consonant.consonantKind}, pulled out for convenience
 */
export type ConsonantKind = "onsetConsonant" | "codaConsonant" | "codaGeminatedConsonant";

/**
 * A part of a syllable which is a Hebrew consonant, including:
 * - Whether the consonant is part of the syllable's coda (or otherwise, onset)
 * - Whether it is from gemination of the first consonant of the following syllable
 */
export class Consonant extends SyllablePart {
  readonly kind = "consonant";

  /**
   * A tag that indicates whether a {@link Consonant} is part of its syllable's coda, its onset but it does not come from gemination of the first consonant of the following syllable, or its onset and it does come from gemination - see {@link partOfOnset}, {@link partOfCoda}, and {@link fromGemination}
   */
  readonly consonantKind: ConsonantKind;

  constructor(chars: Char[], syllable: Syllable, consonantKind: ConsonantKind) {
    super(chars, syllable);
    this.consonantKind = consonantKind;
  }

  apply<T>(map: SyllablePartMap<T>): T {
    if (this.fromGemination && map.onGeminatedConsonant) {
      return matchSyllablePart(map.onGeminatedConsonant, this);
    }
    return matchSyllablePart(map.onConsonant, this);
  }

  /**
   * Returns `true` if this consonant is part of the {@link Syllable.onset onset} of its {@link Syllable}
   *
   * @example
   * ```ts
   * const text: Text = new Text("בַּ֥ד");
   * text.syllables[0].parts[0].partOfOnset;
   * // true
   * text.syllables[0].parts[3].partOfOnset;
   * // false
   * ```
   */
  get partOfOnset(): boolean {
    return this.consonantKind === "onsetConsonant";
  }

  /**
   * Returns `true` if this consonant is part of the {@link Syllable.coda coda} of its {@link Syllable}
   *
   * @example
   * ```ts
   * const text: Text = new Text("בַּ֥ד");
   * text.syllables[0].parts[0].partOfCoda;
   * // false
   * text.syllables[0].parts[3].partOfCoda;
   * // true
   * ```
   */
  get partOfCoda(): boolean {
    return this.consonantKind !== "onsetConsonant";
  }

  /**
   * Returns `true` if this consonant is part of the {@link Syllable.coda coda} of its {@link Syllable} and does not comes from gemination of first consonant of the following syllable
   *
   * @example
   * ```ts
   * const text: Text = new Text("שַׁבָּת");
   * text.syllables[0].parts[2].partOfCodaNotFromGemination
   * // false
   * text.syllables[1].parts[2].partOfCodaNotFromGemination
   * // true
   * ```
   */
  get partOfCodaNotFromGemination(): boolean {
    return this.consonantKind === "codaConsonant";
  }

  /**
   * Returns `true` if this consonant is comes from gemination of first consonant of the following syllable
   *
   * @example
   * ```ts
   * const text: Text = new Text("שַׁבָּת");
   * text.syllables[0].parts[2].fromGemination
   * // true
   * text.syllables[1].parts[2].fromGemination
   * // false
   * ```
   */
  get fromGemination(): boolean {
    return this.consonantKind === "codaGeminatedConsonant";
  }
}

/**
 * A part of a syllable which is a Hebrew vowel
 */
export class Vowel extends SyllablePart {
  readonly kind = "vowel";

  apply<T>(map: SyllablePartMap<T>): T {
    return matchSyllablePart(map.onVowel, this, "א");
  }
}

/**
 * A part of a syllable which is a Hebrew mark that is neither a consonant or a vowel
 */
export class HebrewMark extends SyllablePart {
  readonly kind = "hebrew mark";

  apply<T>(map: SyllablePartMap<T>): T {
    if (!map.onHebrewMark) {
      throw new Error("No mapping defined for Hebrew marks!");
    }
    return matchSyllablePart(map.onHebrewMark, this, "א");
  }
}

/**
 * A part of a syllable which is a non-Hebrew character
 */
export class NonHebrew extends SyllablePart {
  readonly kind = "non-hebrew";

  apply<T>(map: SyllablePartMap<T>): T {
    if (!map.onNonHebrew) {
      throw new Error("No mapping defined for non-Hebrew syllable parts!");
    }
    return matchSyllablePart(map.onNonHebrew, this, "א");
  }
}

/**
 * A mapping from an arbitrary {@link SyllablePart} to a value of type `T`, made from multiple {@link SyllablePartMatcher | SyllablePartMatchers}
 *
 * @example
 * ```ts
 * const map: SyllablePartMap<string> = {
 *   onConsonant: {
 *     // if it applies, "בּ" will match before "ב" because it is longer
 *     "ב": "v", "בּ": "b",
 *     // these will also match "דּ" and "לּ", respectively
 *     "ד": "d", "ל": "l"
 *     // as written, consonants starting with any other letter will error -
 *     // to prevent this, provide a default case (see below)
 *   },
 *   onVowel: {
 *     // aleph prefixes are just for readability - they are ignored
 *     "אַ": "a", "אְ": "e",
 *   },
 *   onHebrewMark: {
 *     // both an example of a default case (i.e. a match on the empty string)
 *     // and a function which takes in the `SyllablePart` it matched
 *     "": (m) => taamim.test(m.text) && m.syllable?.isAccented ? '́' : ''
 *   },
 *   // as written, any non-Hebrew mark will error - to prevent this, give a
 *   // value for `onNonHebrew`
 * };
 * const bad: Text = new Text("בַּ֥ד");
 * bad.syllables[0].parts.map((p) => p.apply(map)).join("");
 * // "bád"
 * const levad: Text = new Text("לְ֠בַ֠ד");
 * levad.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("");
 * // "levád"
 * ```
 *
 * @example
 * ```ts
 * const map: SyllablePartMap<string> = {
 *   onConsonant: { "": "C" },
 *   // see the docstring for the below for an example that explains it better
 *   onGeminatedConsonant: { "": "G" },
 *   onVowel: { "": "V" },
 *   onHebrewMark: { "": "M" },
 *   onNonHebrew: { "": "N" }
 * };
 * ```
 * expect(new Text("שַׁבָּ֥ת.").syllables.map((s) => s.parts.map((p) => p.apply(map)).join(""))
 * // ["CVG", "CVMCN"]
 * );
 */
export interface SyllablePartMap<T> {
  /**
   * The {@link SyllablePartMatcher} to apply to a {@link Consonant}
   */
  onConsonant: SyllablePartMatcher<Consonant, T>;
  /**
   * If given, apply this separate {@link SyllablePartMatcher} to a {@link Consonant} for which {@link fromGemination} is `true` - i.e. coda consonants which are the result of a geminated consonant at the start of the following syllable
   *
   * @example
   * ```ts
   * let map: SyllablePartMap<string> = {
   *   onConsonant: { "שׁ": "sh", "בּ": "b", "ת": "t" },
   *   onVowel: { "אַ": "a", "אָ": "a" },
   * };
   * const text: Text = new Text("שַׁבָּת");
   * text.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("");
   * // "shabbat"
   * map.onGeminatedConsonant = {
   *   "": "" // ignore every geminated consonant
   * };
   * text.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("");
   * // "shabat"
   * ```
   */
  onGeminatedConsonant?: SyllablePartMatcher<Consonant, T>;
  /**
   * The {@link SyllablePartMatcher} to apply to a {@link Vowel}
   *
   * @remark Entries can be preceded by an optional aleph ('א')
   */
  onVowel: SyllablePartMatcher<Vowel, T, "א">;
  /**
   * The {@link SyllablePartMatcher} to apply to a {@link HebrewMark}, throwing an error if this is not given and a {@link HebrewMark} is encountered
   *
   * @remark Entries can be preceded by an optional aleph ('א')
   */
  onHebrewMark?: SyllablePartMatcher<HebrewMark, T, "א">;
  /**
   * The {@link SyllablePartMatcher} to apply to a {@link NonHebrew} part, throwing an error if this is not given and a {@link NonHebrew} part is encountered
   *
   * @remark Entries can be preceded by an optional aleph ('א')
   */
  onNonHebrew?: SyllablePartMatcher<NonHebrew, T, "א">;
}

/**
 * A mapping from the text of a {@link SyllablePart} to a value of type `T`.
 *
 * Keys are strings which are matched against a {@link SyllablePart | SyllablePart's} text from longest to shortest - always beginning with the start of the text, except perhaps a prefix which is one of the `_AllowedPrefixes` (used in {@link matchSyllablePart})
 *
 * Values can either be elements of type `T` or functions which take the matched part as a parameter (where only the latter are permitted if `T` itself is a function type, in order to prevent ambiguity).
 */
export type SyllablePartMatcher<P extends SyllablePart, T, _AllowedPrefixes extends string = never> = {
  [matchFromStart: string]: Exclude<T, Function> | ((part: P) => T);
};

/**
 * Applies a {@link SyllablePartMatcher} to a {@link SyllablePart}, throwing an error if no match can be found
 *
 * @param matcher the matcher to apply
 * @param p the part to match against
 * @param prefix an optional string to ignore at the start of keys in `matcher`, must be in the `AllowedPrefixes` in the type of `matcher`
 *
 * @returns the value of the matching key, or the result of calling it on `p` if it's a function
 */
function matchSyllablePart<P extends SyllablePart, T, AllowedPrefixes extends string, Prefix extends AllowedPrefixes>(
  matcher: SyllablePartMatcher<P, T, AllowedPrefixes>,
  p: P,
  prefix?: Prefix
): T {
  const txt = p.text;
  const prefixes = prefix !== undefined ? [prefix, ""] : [""];
  for (let n = txt.length; n >= 0; n--) {
    for (const pfx of prefixes) {
      const m = matcher[pfx + txt.slice(0, n)];
      if (m !== undefined) {
        if (typeof m === "function") {
          // As for why a cast is needed here, see:
          // https://github.com/microsoft/TypeScript/issues/57246
          return (m as (part: P) => T)(p);
        }
        return m;
      }
    }
  }
  throw new Error(`No match found for ${p.kind}: ${p.text}`);
}
