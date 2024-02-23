import { Cluster } from "./cluster";
import { Char } from "./char";
import { SyllablePart, Consonant, Vowel, HebrewMark, NonHebrew, ConsonantType } from "./syllablePart";
import { CharToNameMap, charToNameMap, NameToCharMap, nameToCharMap } from "./utils/vowelMap";
import { vowelsCaptureGroupWithSheva, hebChars } from "./utils/regularExpressions";
import { Node } from "./node";
import { Word } from "./word";

interface SyllableCharToNameMap extends CharToNameMap {
  /* eslint-disable  @typescript-eslint/naming-convention */
  "\u{05B0}": "SHEVA"; // HEBREW POINT HATAF SHEVA (U+05B0)
  /**
   * Unlike a holam vav construction which has the holam present, the shureq has no vowel character.
   */
  "\u{05D5}\u{05BC}": "SHUREQ"; // HEBREW LETTER VAV (U+05D5) + HEBREW POINT DAGESH OR MAPIQ (U+05BC)
}

const sylCharToNameMap: SyllableCharToNameMap = {
  ...charToNameMap,
  "\u{05B0}": "SHEVA",
  "\u{05D5}\u{05BC}": "SHUREQ"
};

interface SyllableNameToCharMap extends NameToCharMap {
  /* eslint-disable  @typescript-eslint/naming-convention */
  SHEVA: "\u{05B0}"; // HEBREW POINT HATAF SHEVA (U+05B0)
  SHUREQ: "\u{05D5}\u{05BC}"; // HEBREW LETTER VAV (U+05D5) + HEBREW POINT DAGESH OR MAPIQ (U+05BC)
}

const sylNameToCharMap: SyllableNameToCharMap = {
  ...nameToCharMap,
  SHEVA: "\u{05B0}",
  SHUREQ: "\u{05D5}\u{05BC}"
};

/**
 * A `Syllable` is created from an array of [[`Clusters`]].
 */
export class Syllable extends Node<Syllable> {
  #clusters: Cluster[];
  #isClosed: boolean;
  #isAccented: boolean;
  #isFinal: boolean;
  #word: Word | null = null;
  #cachedParts: SyllablePart[] | null = null;
  #cachedStructure: [Consonant[], Vowel[], Consonant[]] | null = null;

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
   * @returns a string that has been built up from the .text of its constituent Clusters
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

  private isVowelKeyOfSyllableCharToNameMap(vowel: string): vowel is keyof SyllableCharToNameMap {
    return vowel in sylCharToNameMap;
  }

  /**
   * Returns the vowel character of the syllable
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character
   *
   * ```typescript
   * const text: Text = new Text("הַֽ֭יְחָבְרְךָ");
   * text.syllables[0].vowel;
   * // "\u{05B7}"
   * text.syllables[1].vowel;
   * // "\u{05B0}"
   * ```
   *
   * @description
   * This returns a single vowel character, even for most mater lectionis (e.g. a holam vav would return the holam, not the vav).
   * The only exception is a shureq, which returns the vav and the dagesh because there is no vowel character for a shureq.
   */
  get vowel(): keyof SyllableCharToNameMap | null {
    const nucleus = this.nucleus.map((p) => p.text).join("");

    // for regular vowel characters and shureqs, this should match
    if (this.isVowelKeyOfSyllableCharToNameMap(nucleus)) {
      return nucleus;
    }

    // for maters or text with mixed scripts (e.g. Hebrew and Latin), we have to extract the vowel character
    const match = this.text.match(vowelsCaptureGroupWithSheva);
    if (match && this.isVowelKeyOfSyllableCharToNameMap(match[0])) {
      return match[0];
    }

    return null;
  }

  /**
   * Returns the vowel character name of the syllable
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character
   *
   * ```typescript
   * const text: Text = new Text("הַֽ֭יְחָבְרְךָ");
   * text.syllables[0].vowelName;
   * // "PATAH"
   * text.syllables[1].vowelName;
   * // "SHEVA"
   *
   * @description
   * This returns the vowel name, even for most mater lectionis (e.g. a holam vav would return the HOLAM, not the vav).
   * The only exception is a shureq, which returns "SHUREQ" because there is no vowel character for a shureq.
   * ```
   */
  get vowelName(): SyllableCharToNameMap[keyof SyllableCharToNameMap] | null {
    const vowel = this.vowel;
    return vowel ? sylCharToNameMap[vowel] : null;
  }

  /**
   * Returns `true` if syllables contains the vowel character of the name passed in
   *
   * According to {@page Syllabification}, a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   * It returns `true` for "SHEVA" only when the sheva is the vowel (i.e. a vocal sheva or sheva na').
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
   * ```
   *
   * @description
   * This returns a boolean if the vowel character is present, even for most mater lectionis (e.g. in a holam vav construction, "HOLAM" would return true)
   * The only exception is a shureq, because there is no vowel character for a shureq.
   */
  hasVowelName(name: keyof SyllableNameToCharMap): boolean {
    if (!sylNameToCharMap[name]) {
      throw new Error(`${name} is not a valid value`);
    }

    if (name === "SHUREQ") {
      // if any cluster has a shureq, then that should be the defacto vowel
      return this.clusters.filter((c) => c.isShureq).length ? true : false;
    }

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

  /**
   * @returns the the list of SyllableParts which make up the Syllable, i.e. its Consonants, Vowels, HebrewMarks, and NonHebrew characters.
   *
   * ```typescript
   * const text: Text = new Text("וּמַדּ֖וּעַ");
   * text.syllables.map((s) => s.parts().map((p) => [p.type, p.text]))
   * // [
   * //   [ [ 'V', 'וּ' ] ],
   * //   [ [ 'C', 'מ' ], [ 'V', 'ַ' ], [ 'C', 'דּ' ] ],
   * //   [ [ 'C', 'דּ' ], [ 'H', '֖' ], [ 'V', 'וּ' ] ],
   * //   [ [ 'V', 'ַ' ], [ 'C', 'ע' ] ]
   * // ]
   * ```
   */
  get parts(): SyllablePart[] {
    if (this.#cachedParts) {
      return this.#cachedParts;
    }
    const parts: SyllablePart[] = [];
    let seenVowel = false;
    for (let i = 0; i < this.clusters.length; i++) {
      let chars = this.clusters[i].chars;
      // Add a shureq as a new Vowel
      if (this.clusters[i].isShureq) {
        parts.push(new Vowel(chars.slice(0, 2)));
        seenVowel = true;
        chars = chars.slice(2);
      }
      // Add a mater as an additional character of the preceding Vowel
      if (this.clusters[i].isMater) {
        for (let j = parts.length - 1; j >= 0; j--) {
          if (parts[j] instanceof Vowel) {
            parts[j] = new Vowel(parts[j].chars.concat([chars[0]]));
            seenVowel = true;
            chars = chars.slice(1);
            break;
          }
        }
      }
      // Furtive patah: If the syllable is final, contains only punctuation and
      // non-hebrew after this cluster, and is either a he with dagesh followed
      // by a patah or an ayin or het followed by a patah, then add the patah
      // as a new Vowel first, then the he/ayin/het as a new Consonant after
      if (this.isFinal && this.clusters.slice(i + 1).every((c) => c.isNotHebrew || c.isPunctuation)) {
        if (chars.length >= 2 && /\u{05D7}|\u{05E2}/u.test(chars[0].text) && chars[1].text === "\u{05B7}") {
          parts.push(new Vowel([chars[1]]));
          seenVowel = true;
          parts.push(new Consonant([chars[0]], ConsonantType.codaConsonant));
          chars = chars.slice(2);
        }
        if (
          chars.length >= 3 &&
          chars[0].text === "\u{05D4}" &&
          chars[1].text === "\u{05BC}" &&
          chars[2].text === "\u{05B7}"
        ) {
          parts.push(new Vowel([chars[2]]));
          seenVowel = true;
          parts.push(new Consonant(chars.slice(0, 2), ConsonantType.codaConsonant));
          chars = chars.slice(3);
        }
      }
      for (const char of chars) {
        // Add a consonant character as a new Consonant
        if (char.sequencePosition === 0) {
          const cType = seenVowel ? ConsonantType.codaConsonant : ConsonantType.onsetConsonant;
          parts.push(new Consonant([char], cType));
        }
        // Add a consonant ligature as an additional character of the preceding
        // Consonant, or if there is no such consonant, as a new HebrewMark
        else if (char.sequencePosition === 1 || char.sequencePosition === 2) {
          let success = false;
          for (let j = parts.length - 1; j >= 0; j++) {
            if (parts[j] instanceof Consonant) {
              const cType = seenVowel ? ConsonantType.codaConsonant : ConsonantType.onsetConsonant;
              parts[j] = new Consonant(parts[j].chars.concat([char]), cType);
              success = true;
              break;
            }
          }
          if (!success) {
            parts.push(new HebrewMark([char]));
          }
        }
        // Add a niqqud character which is not a sheva nah (a non-vocal sheva,
        // i.e. a sheva not in the first cluster) as a new Vowel, and add a
        // sheva nah as a new HebrewMark
        else if (char.sequencePosition === 3) {
          if (char.text === "\u{05B0}" && i > 0) {
            parts.push(new HebrewMark([char]));
          } else {
            parts.push(new Vowel([char]));
            seenVowel = true;
          }
        }
        // Add any other Hebrew character as a new a HebrewMark
        else if (hebChars.test(char.text)) {
          parts.push(new HebrewMark([char]));
        }
        // Add anything else as a new NonHebrew SyllablePart
        else {
          parts.push(new NonHebrew([char]));
        }
      }
    }
    // Give every SyllablePart a reference to this Syllable, and compute some
    // conditions needed for gemination check below
    let [hasNonShevaVowel, hasConsonantAfterVowel] = [false, false];
    for (const part of parts) {
      part.syllable = this;
      if (part instanceof Vowel && !/\u{05B0}/u.test(part.text)) {
        hasNonShevaVowel = true;
      } else if (hasNonShevaVowel && part instanceof Consonant) {
        hasConsonantAfterVowel = true;
      }
    }
    // If this is a non-final syllable, this syllable has a non-Sheva vowel, the
    // syllable is open (i.e. there is no consonant after the vowel), and the
    // first cluster of the next syllable has a dagesh which is not part of a
    // shureq, then add the consonant and its dagesh from the next syllable as
    // an additional Consonant (marked as fromGemination)
    if (
      !this.isFinal &&
      hasNonShevaVowel &&
      !hasConsonantAfterVowel &&
      this.next instanceof Syllable &&
      this.next.clusters.length > 0 &&
      /\u{05BC}/u.test(this.next.clusters[0].text) &&
      !this.next.clusters[0].isShureq
    ) {
      const chars = this.next.clusters[0].chars.filter((c) => c.sequencePosition <= 2);
      const part = new Consonant(chars, ConsonantType.codaGeminatedConsonant);
      part.syllable = this;
      parts.push(part);
    }
    this.#cachedParts = parts;
    return parts;
  }

  /**
   * @returns the structure of the Syllable, i.e. the syllable's onset, nucleus, and coda.
   * - The onset is any initial consonant of the syllable - present in every syllable except those containing a except word-initial shureq or a furtive patah.
   * - The nucleus is the vowel of the syllable - present in every syllable and containing its {@link vowel} (with any materes lecticonis) or a shureq.
   * - The coda is all final consonants of the syllable - not including any matres lecticonis, and including the onset of the subsequent syllable if the subsequent syllable is geminated.
   *
   * ```typescript
   * const text: Text = new Text("וּמַדּ֖וּעַ");
   * text.syllables.map((s) => s.structure.map((st) => st.map((p) => p.text)))
   * // [
   * //   [ [], [ 'וּ' ], [] ],
   * //   [ [ 'מ' ], [ 'ַ' ], [ 'דּ' ] ],
   * //   [ [ 'דּ' ], [ 'וּ' ], [] ],
   * //   [ [], [ 'ַ' ], [ 'ע' ] ]
   * // ]
   * ```
   */
  get structure(): [Consonant[], Vowel[], Consonant[]] {
    if (this.#cachedStructure) {
      return this.#cachedStructure;
    }
    const onset: Consonant[] = [];
    const nucleus: Vowel[] = [];
    const coda: Consonant[] = [];
    for (const p of this.parts) {
      if (p instanceof Consonant) {
        if (nucleus.length === 0) {
          onset.push(p);
        } else {
          coda.push(p);
        }
      }
      if (p instanceof Vowel) {
        if (coda.length === 0) {
          nucleus.push(p);
        } else {
          throw new Error("Syllable contains a consonant between two vowels, i.e. does not have (C)V(C) structure");
        }
      }
    }
    const structure: [Consonant[], Vowel[], Consonant[]] = [onset, nucleus, coda];
    this.#cachedStructure = structure;
    return structure;
  }

  /**
   * Returns the onset of the syllable - see {@link structure}
   */
  get onset(): Consonant[] {
    return this.structure[0];
  }

  /**
   * @returns the nucleus of the syllable - see {@link structure}
   */
  get nucleus(): Vowel[] {
    return this.structure[1];
  }

  /**
   * @returns the coda of the syllable, including gemination - see {@link structure}
   */
  get coda(): Consonant[] {
    return this.structure[2];
  }

  /**
   * @returns the coda of the syllable, ignoring gemination - see {@link structure}
   */
  get codaNoGemination(): Consonant[] {
    return this.structure[2].filter((p) => !p.fromGemination);
  }

  get word(): Word | null {
    return this.#word;
  }

  set word(word: Word | null) {
    this.#word = word;
  }
}
