import { Cluster } from "./cluster";
import { Char } from "./char";
import { CharToNameMap, charToNameMap, NameToCharMap, nameToCharMap } from "./utils/vowelMap";
import { vowelsCaptureGroupWithSheva } from "./utils/regularExpressions";
import { Node } from "./node";

interface SyllableCharToNameMap extends CharToNameMap {
  /* eslint-disable  @typescript-eslint/naming-convention */
  "\u{05B0}": "SHEVA"; // HEBREW POINT HATAF SHEVA (U+05B0)
  "\u{FB35}": "SHUREQ"; // HEBREW LETTER VAV WITH DAGESH (U+FB35)
}

const sylCharToNameMap: SyllableCharToNameMap = {
  ...charToNameMap,
  "\u{05B0}": "SHEVA",
  "\u{FB35}": "SHUREQ"
};

interface SyllableNameToCharMap extends NameToCharMap {
  /* eslint-disable  @typescript-eslint/naming-convention */
  SHEVA: "\u{05B0}"; // HEBREW POINT HATAF SHEVA (U+05B0)
  SHUREQ: "\u{FB35}"; // HEBREW LETTER VAV WITH DAGESH (U+FB35)
}

const sylNameToCharMap: SyllableNameToCharMap = {
  ...nameToCharMap,
  SHEVA: "\u{05B0}",
  SHUREQ: "\u{FB35}"
};

/**
 * A `Syllable` is created from an array of [[`Clusters`]].
 */
export class Syllable extends Node<Syllable> {
  #clusters: Cluster[];
  #isClosed: boolean;
  #isAccented: boolean;
  #isFinal: boolean;

  /**
   *
   * @param clusters
   * @param param1
   *
   * See the {@page Syllabification} page for how a syllable is determined.
   * Currently, the Divine Name (e.g. יהוה), non-Hebrew text, and Hebrew punctuation (e.g. _passeq_, _nun hafucha_) are treated as a _single syllable_ because these do not follow the rules of Hebrew syllabification.
   */
  constructor(clusters: Cluster[], { isClosed = false, isAccented = false, isFinal = false } = {}) {
    super();
    this.value = this;
    this.#clusters = clusters;
    this.#isClosed = isClosed;
    this.#isAccented = isAccented;
    this.#isFinal = isFinal;
  }

  /**
   * @returns a string that has been built up from the .text of its consituent Clusters
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א");
   * const sylText = text.syllables.map((syl) => syl.text);
   * sylText;
   * //  [
   * //    "וַ"
   * //    "יִּקְ"
   * //    "רָ֨א"
   * //  ]
   * ```
   */
  get text(): string {
    return this.clusters.reduce((init, cluster) => init + cluster.text, "");
  }

  /**
   * @returns a one dimensional array of Clusters
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א");
   * text.syllables[1].clusters;
   * // [
   * //    Cluster { original: "יִּ" },
   * //    Cluster { original: "קְ" }
   * //  ]
   * ```
   */
  get clusters(): Cluster[] {
    return this.#clusters;
  }

  /**
   * @returns a one dimensional array of Chars
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א");
   * text.syllables[2].chars;
   * // [
   * //    Char { original: "ר" },
   * //    Char { original: "ָ" },
   * //    Char { original: "" }, i.e. \u{05A8} (does not print well)
   * //    Char { original: "א" }
   * //  ]
   * ```
   */
  get chars(): Char[] {
    return this.clusters.map((cluster) => cluster.chars).flat();
  }

  /**
   * Returns the vowel character of the syllable
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   * Similarly, a shureq is a vowel character here, unlike `Cluster`.
   *
   * ```typescript
   * const text: Text = new Text("הַֽ֭יְחָבְרְךָ");
   * text.syllables[0].vowel;
   * // "\u{05B7}"
   * text.syllables[1].vowel;
   * // "\u{05B0}"
   * 
   * const shureqText: Text = new Text("שׁוּרֶק");
   * shureqText.syllables[0].vowel;
   * // "\u{FB35}"
   * ```
   */
  get vowel(): keyof SyllableCharToNameMap | null {
    const match = this.text.match(vowelsCaptureGroupWithSheva);
    if (match) return match[0] as keyof SyllableCharToNameMap;
    return this.clusters.some(c => c.isShureq) ? sylNameToCharMap.SHUREQ : null;
  }

  /**
   * Returns the vowel character name of the syllable
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   * Similarly, a shureq is a vowel character here, unlike `Cluster`.
   *
   * ```typescript
   * const text: Text = new Text("הַֽ֭יְחָבְרְךָ");
   * text.syllables[0].vowelName;
   * // "PATAH"
   * text.syllables[1].vowelName;
   * // "SHEVA"
   * 
   * const shureqText: Text = new Text("שׁוּרֶק");
   * shureqText.syllables[0].vowelName;
   * // "SHUREQ"
   * ```
   */
  get vowelName(): SyllableCharToNameMap[keyof SyllableCharToNameMap] | null {
    const vowel = this.vowel;
    return vowel ? sylCharToNameMap[vowel] : null;
  }

  /**
   * Returns `true` if the syllable contains the vowel character of the name passed in
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   * It returns `true` for "SHEVA" only when the sheva is the vowel (i.e. a vocal sheva or sheva na').
   * 
   * Similarly, a shureq is a vowel character here, unlike `Cluster`. It returns true for "SHUREQ"
   * only when there is a cluster with `Cluster.isShureq` equal to true and no other vowel.
   *
   * ```typescript
   * const text: Text = new Text("הַיְחָבְרְךָ");
   * text.syllables[0].hasVowelName("PATAH");
   * // true
   *
   * // test for vocal sheva
   * text.syllables[1].hasVowelName("SHEVA");
   * // true
   *
   * // test for silent sheva
   * text.syllables[2].hasVowelName("SHEVA");
   * // false
   * 
   * // test for shureq
   * const shureqText: Text = new Text("שׁוּרֶק");
   * shureqText.syllables[0].hasVowelName("SHUREQ");
   * // true
   * 
   * // test for vav dagesh which is not a shureq
   * const vavDageshText: Text = new Text("גֵּוּ");
   * shureqText.syllables[0].hasVowelName("SHUREQ");
   * // false
   * ```
   */
  hasVowelName(name: keyof SyllableNameToCharMap): boolean {
    if (!sylNameToCharMap[name]) throw new Error(`${name} is not a valid value`);
    if (name === "SHUREQ") return this.vowelName === "SHUREQ";
    const isShevaSilent = name === "SHEVA" && this.clusters.filter((c) => c.hasVowel).length ? true : false;
    return !isShevaSilent && this.text.indexOf(sylNameToCharMap[name]) !== -1 ? true : false;
  }

  /**
   * @returns true if Syllable is closed
   *
   * a closed syllable in Hebrew is a CVC or CVCC type, a mater letter does not close a syllable
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].isClosed; // i.e. "וַ"
   * // true
   * text.syllables[2].isClosed; // i.e. "רָ֨א"
   * // false
   * ```
   */
  get isClosed(): boolean {
    return this.#isClosed;
  }

  /**
   * @param closed a boolean for whether the Syllable is closed
   *
   * a closed syllable in Hebrew is a CVC or CVCC type, a _mater_ letter does not close a syllable
   */
  set isClosed(closed: boolean) {
    this.#isClosed = closed;
  }

  /**
   * @returns true if Syllable is accented
   *
   * an accented syllable receives stress
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א"); // note the taam over the ר
   * text.syllables[0].isAccented; // i.e. "וַ"
   * // false
   * text.syllables[2].isAccented; // i.e. "רָ֨א"
   * // true
   * ```
   */
  get isAccented(): boolean {
    return this.#isAccented;
  }

  /**
   * @param accented a boolean for whether the Syllable is accented
   *
   * an accented syllable receives stress
   */
  set isAccented(accented: boolean) {
    this.#isAccented = accented;
  }

  /**
   * @returns true if Syllable is final
   *
   * ```typescript
   * const text: Text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].isFinal; // i.e. "וַ"
   * // false
   * text.syllables[2].isFinal; // i.e. "רָ֨א"
   * // true
   * ```
   */
  get isFinal(): boolean {
    return this.#isFinal;
  }

  /**
   * @param final a boolean for whether the Syllable is the final Syallble
   */
  set isFinal(final: boolean) {
    this.#isFinal = final;
  }
}
