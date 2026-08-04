import { Cluster } from "./cluster";
import { Node } from "./node";
import { Consonant, HebrewMark, NonHebrew, SyllablePart, Vowel } from "./syllablePart";
import type { ConsonantName, Flip, TaamimName } from "./utils/charMap";
import { consonantNameToCharMap, taamimNameToCharMap, vowelCharToNameMap, vowelNameToCharMap } from "./utils/charMap";
import type { DivineNameReplacement } from "./utils/divineName";
import { adonaiOrElohim, divineNameForm, replaceDivineName } from "./utils/divineName";
import { hebChars } from "./utils/regularExpressions";
import { Word } from "./word";

const sylVowelCharToNameMap = {
  ...vowelCharToNameMap,
  "\u{05B0}": "SHEVA",
  "\u{05D5}\u{05BC}": "SHUREQ"
} as const;

export type SyllableVowelCharToNameMap = typeof sylVowelCharToNameMap;
export type SyllableVowel = keyof SyllableVowelCharToNameMap;

export type SyllableVowelNameToCharMap = Flip<SyllableVowelCharToNameMap>;
export type SyllableVowelName = keyof SyllableVowelNameToCharMap;

const sylVowelNameToCharMap = {
  ...vowelNameToCharMap,
  SHEVA: "\u{05B0}",
  SHUREQ: "\u{05D5}\u{05BC}"
} as const;

export type SyllableParams = {
  isClosed?: boolean;
  isAccented?: boolean;
  isFinal?: boolean;
};

/**
 * The onset, nucleus, and coda of a {@link Syllable} - see {@link Syllable.structure}
 */
export type SyllableStructure = [Consonant[], Vowel[], Consonant[]];

/**
 * A subunit of a {@link Word} consisting of consonants, vowels, and other linguistic and ortographic features.
 */
export class Syllable extends Node<Syllable, Cluster, Word> {
  #cachedParts: SyllablePart[] | null = null;
  #cachedPartsNoGemination: SyllablePart[] | null = null;
  #cachedStructure: SyllableStructure | null = null;
  #cachedStructureNoGemination: SyllableStructure | null = null;
  #clusters: Cluster[];
  #isClosed: boolean;
  #isAccented: boolean;
  #vowelsCache: SyllableVowel[] | null = null;
  #vowelNamesCache: SyllableVowelName[] | null = null;

  /**
   * Creates a new Syllable
   *
   * @param clusters an array of {@link Cluster}
   * @param options optional parameters
   *
   * @example
   * ```ts
   * new Syllable([new Cluster("אָ"), new Cluster("ב")]);
   * ```
   *
   * @remarks
   * See the [Syllabification](/guides/syllabification) page for how a syllable is determined.
   * Currently, the Divine Name (e.g. יהוה), non-Hebrew text, and Hebrew punctuation (e.g. _passeq_, _nun hafucha_) are treated as a _single syllable_ because these do not follow the rules of Hebrew syllabification.
   * However, any prefixes on the Divine Name are still syllabified, except for a final prefix which is read with the name (e.g. לַֽיהוָ֖ה).
   */
  constructor(clusters: Cluster[], { isClosed = false, isAccented = false }: SyllableParams = {}) {
    super();
    this.value = this;
    this.#clusters = clusters;
    this.#isClosed = isClosed;
    this.#isAccented = isAccented;
  }

  #isCharKeyOfSyllableVowelCharToNameMap(char: string): char is keyof SyllableVowelCharToNameMap {
    return char in sylVowelCharToNameMap;
  }

  /**
   * Gets all the {@link Char | Characters} in the Syllable
   *
   * @returns a one dimensional array of {@link Char | characters}
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[2].chars;
   * // [
   * //    Char { original: "ר" },
   * //    Char { original: "ָ" },
   * //    Char { original: "" }, i.e. \u{05A8} (does not print well)
   * //    Char { original: "א" }
   * //  ]
   * ```
   */
  get chars() {
    return this.clusters.map((cluster) => cluster.chars).flat();
  }

  /**
   * Gets all the {@link Cluster | Clusters} in the Syllable
   *
   * @returns a one dimensional array of {@link Cluster | clusters}
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[1].clusters;
   * // [
   * //    Cluster { original: "יִּ" },
   * //    Cluster { original: "קְ" }
   * //  ]
   * ```
   */
  get clusters() {
    return this.#clusters;
  }

  /**
   * Gets the coda of the syllable, including gemination of the following syllable - see {@link structure}
   *
   * @returns the {@link Consonant | Consonants} of the coda, including any consonant geminated from the following syllable - see {@link codaNoGemination}
   *
   * @example
   * ```ts
   * const text = new Text("מַדּ֥וּעַ");
   * text.syllables[0].coda.map((c) => c.text);
   * // ["דּ"]
   * text.syllables[0].codaNoGemination; // without gemination
   * // []
   * ```
   *
   * @remarks
   * Taamim are not part of the coda; they are {@link HebrewMark} parts - see {@link parts}.
   */
  get coda() {
    return this.structure[2];
  }

  /**
   * Gets the coda of the syllable, ignoring gemination of the following syllable - see {@link structure}
   *
   * @returns the {@link Consonant | Consonants} of the coda, excluding any consonant geminated from the following syllable - see {@link coda}
   *
   * @example
   * ```ts
   * const text = new Text("יָ֥ם");
   * text.syllables[0].codaNoGemination.map((c) => c.text);
   * // ["ם"]
   * ```
   */
  get codaNoGemination() {
    return this.#resolveStructure().structureNoGemination[2];
  }

  /**
   * Gets the consonant _characters_ of the syllable
   *
   * @returns a one dimensional array of consonant characters
   *
   * @example
   * ```ts
   * const text = new Text("רְ֭שָׁעִים");
   * text.syllables[2].consonants;
   * // ["ע", "י", "ם"]
   * ```
   *
   * @remarks
   * This returns a one dimensional array of consonant characters, even if the characters are not phonemic consonants,
   * meaning even maters are returned as consonant characters. See the {@link structure} method if you need the consonants with phonemic value.
   *
   *
   */
  get consonants() {
    return this.clusters.map((cluster) => cluster.consonants).flat();
  }

  /**
   * Gets the names of the consonant _characters_ of the syllable
   *
   * @returns a one dimensional array of consonant character names
   *
   * @example
   * ```ts
   * const text = new Text("רְ֭שָׁעִים");
   * text.syllables[2].consonantNames;
   * // ["AYIN", "YOD", "FINAL_MEM"]
   * ```
   *
   * @remarks
   * This returns a one dimensional array of consonant names, even if the characters are not phonemic consonants,
   * meaning even the name of maters are returned. See the {@link structure} method if you need the consonants with phonemic value.
   */
  get consonantNames() {
    return this.clusters.map((cluster) => cluster.consonantNames).flat();
  }

  /**
   * Checks if the syllable contains the consonant _character_ matching the name passed in
   *
   * @returns a boolean indicating if the syllable contains the consonant _character_ matching the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("רְ֭שָׁעִים");
   * text.syllables[2].hasConsonantName("AYIN");
   * // true
   * text.syllables[2].hasConsonantName("YOD");
   * // false
   * ```
   *
   * @remarks
   * This checks if the syllable contains the given consonant name, even if the character is not a phonemic consonant.
   */
  hasConsonantName(name: ConsonantName) {
    if (!consonantNameToCharMap[name]) {
      throw new Error(`${name} is not a valid value`);
    }

    return this.consonantNames.includes(name);
  }

  /**
   * Checks if the syllable contains the vowel character of the name passed in
   *
   * @returns a boolean indicating if the syllable contains the vowel character of the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("הַיְחָבְרְךָ");
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
   * @remarks
   * This returns a boolean if the vowel character is present, even for most mater lectionis (e.g. in a holam vav construction, "HOLAM" would return true)
   * The only exception is a shureq, because there is no vowel character for a shureq.
   * According to [Syllabification](/guides/syllabification), a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   * It returns `true` for "SHEVA" only when the sheva is the vowel (i.e. a vocal sheva or sheva na').
   */
  hasVowelName(name: SyllableVowelName) {
    if (!sylVowelNameToCharMap[name]) {
      throw new Error(`${name} is not a valid value`);
    }

    return this.vowelNames.includes(name);
  }

  /**
   * Checks if the syllable contains the taamim character of the name passed in
   *
   * @returns a boolean indicating if the syllable contains the taamim character of the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.syllables[1].hasTaamName("TIPEHA");
   * // true
   * ```
   *
   * @remarks
   * Note: it only checks according to the character name, not its semantic meaning.
   * E.g. "כֵֽן׃" would be `true` when checking for `"METEG"`, not silluq
   */
  hasTaamName(name: TaamimName) {
    if (!taamimNameToCharMap[name]) {
      throw new Error(`${name} is not a valid value`);
    }
    return this.taamimNames.includes(name);
  }

  /**
   * Checks if the Syllable is a form of the Divine Name (i.e the tetragrammaton), that is, if it is read as the Divine Name
   *
   * @returns a boolean indicating if the Syllable is a form of the Divine Name
   *
   * @example
   * ```ts
   * const text = new Text("וְלַֽיהוָ֖ה");
   * text.syllables.map((syl) => syl.hasDivineName);
   * // [false, true], i.e. only "לַֽיהוָ֖ה"
   * ```
   *
   * @remarks
   * The Divine Name does not follow the rules of Hebrew syllabification, so it is read as a single syllable -
   * either alone (e.g. "יְהוָ֥ה") or together with the single prefix it is read with (e.g. "לַֽיהוָ֖ה"), the
   * remaining prefixes being syllabified as usual.
   */
  get hasDivineName() {
    return divineNameForm(this.text) !== null;
  }

  /**
   * Checks if the Syllable is accented
   *
   * @returns true if Syllable is accented
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א"); // note the taam over the ר
   * text.syllables[0].isAccented; // i.e. "וַ"
   * // false
   * text.syllables[2].isAccented; // i.e. "רָ֨א"
   * // true
   * ```
   *
   * @remarks
   * An accented syllable receives stress, and is typically indicated by the presence of a taam character
   */
  get isAccented() {
    return this.#isAccented;
  }

  /**
   * Sets whether the Syllable is accented
   *
   * @param accented a boolean indicating if the Syllable is accented
   *
   */
  set isAccented(accented: boolean) {
    this.#isAccented = accented;
  }

  /**
   * Checks if the Syllable is closed
   *
   * @returns true if Syllable is closed
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].isClosed; // i.e. "וַ"
   * // true
   * text.syllables[2].isClosed; // i.e. "רָ֨א"
   * // false
   * ```
   *
   * @remarks
   * A closed syllable in Hebrew is a CVC or CVCC type, a mater letter does not close a syllable
   */
  get isClosed() {
    return this.#isClosed;
  }

  /**
   * Sets whether the Syllable is closed
   *
   * @param closed a boolean for whether the Syllable is closed
   *
   */
  set isClosed(closed: boolean) {
    this.#isClosed = closed;
  }

  /**
   * Checks if the Syllable is the final syllable in a {@link Word}
   *
   * @returns true if Syllable is final
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].isFinal; // i.e. "וַ"
   * // false
   * text.syllables[2].isFinal; // i.e. "רָ֨א"
   * // true
   * ```
   */
  get isFinal() {
    return this.word !== null && this.next === null;
  }

  /**
   * Checks if the Syllable is the initial syllable in a {@link Word}
   *
   * @returns true if Syllable is initial
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].isInitial; // i.e. "וַ"
   * // true
   * text.syllables[2].isInitial; // i.e. "רָ֨א"
   * // false
   * ```
   */
  get isInitial() {
    return this.word !== null && this.prev === null;
  }

  /**
   * Returns the nucleus of the syllable - see {@link structure}
   *
   * @returns the {@link Vowel | Vowels} of the nucleus - see {@link structure}
   *
   * @example
   * ```ts
   * const text = new Text("יָ֥ם");
   * text.syllables[0].nucleus.map((v) => v.text);
   * // ["\u{05B8}"]
   * ```
   * @remarks
   * The nucleus is the vowel of the syllable - present in every syllable and containing its {@link vowels} (with any materes lecticonis) or a shureq.
   * Taamim are not part of the nucleus; they are {@link HebrewMark} parts - see {@link parts}.
   */
  get nucleus() {
    return this.structure[1];
  }

  /**
   * Returns the onset of the syllable - see {@link structure}
   *
   * @returns the {@link Consonant | Consonants} of the onset - see {@link structure}
   *
   * @example
   * ```ts
   * const text = new Text("יָ֥ם");
   * text.syllables[0].onset.map((c) => c.text);
   * // ["י"]
   * ```
   * @remarks
   * The onset is any initial consonant of the syllable - present in every syllable except those containing a except word-initial shureq or a furtive patah.
   */
  get onset() {
    return this.structure[0];
  }

  /**
   * Returns the position of the Syllable within its {@link Word}
   *
   * @returns the position of the Syllable, or `-1` if the Syllable is not part of a Word
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables[0].position;
   * // 0
   * text.syllables[2].position;
   * // 2
   * ```
   */
  get position(): number {
    if (this.word === null) {
      return -1;
    }
    // This syllable's position is exactly equal to the number of times you
    // have to go backwards (i.e. shift focus to the `prev` syllable) until
    // you reach the start of the word and there are no syllables left
    let posn = 0;
    let focus = this as Syllable;
    while (focus.prev !== null) {
      // Should never happen, so return our error value if `value` is not set
      if (focus.prev.value === null) {
        return -1;
      }
      posn++;
      focus = focus.prev.value;
    }
    return posn;
  }

  /**
   * Builds the {@link SyllablePart | SyllableParts} of this syllable
   *
   * @returns `partsNoGemination`, plus `parts` which additionally contains any consonant
   * geminated from the following syllable. When no gemination applies the two are the
   * *same array*, so callers can compare them by reference to skip redundant work.
   */
  #buildParts(): { parts: SyllablePart[]; partsNoGemination: SyllablePart[] } {
    const parts: SyllablePart[] = [];
    let seenVowel = false;

    for (let i = 0; i < this.clusters.length; i++) {
      const cluster = this.clusters[i];
      let chars = cluster.chars;

      // Add a shureq as a new Vowel
      if (cluster.isShureq) {
        parts.push(new Vowel(chars.slice(0, 2), this));
        seenVowel = true;
        chars = chars.slice(2);
      }

      // Add a mater as an additional character of the preceding Vowel
      if (cluster.isMater) {
        for (let j = parts.length - 1; j >= 0; j--) {
          if (parts[j] instanceof Vowel) {
            parts[j] = new Vowel(parts[j].chars.concat([chars[0]]), this);
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
          parts.push(new Vowel([chars[1]], this));
          seenVowel = true;
          parts.push(new Consonant([chars[0]], this, "codaConsonant"));
          chars = chars.slice(2);
        }
        if (
          chars.length >= 3 &&
          chars[0].text === "\u{05D4}" &&
          chars[1].text === "\u{05BC}" &&
          chars[2].text === "\u{05B7}"
        ) {
          parts.push(new Vowel([chars[2]], this));
          seenVowel = true;
          parts.push(new Consonant(chars.slice(0, 2), this, "codaConsonant"));
          chars = chars.slice(3);
        }
      }

      for (const char of chars) {
        // Add a consonant character as a new Consonant
        if (char.sequencePosition === 0) {
          const cType = seenVowel ? "codaConsonant" : "onsetConsonant";
          parts.push(new Consonant([char], this, cType));
        }
        // Add a consonant ligature as an additional character of the preceding
        // Consonant, or if there is no such consonant, as a new HebrewMark
        else if (char.sequencePosition === 1 || char.sequencePosition === 2) {
          let success = false;
          for (let j = parts.length - 1; j >= 0; j--) {
            if (parts[j] instanceof Consonant) {
              const cType = seenVowel ? "codaConsonant" : "onsetConsonant";
              parts[j] = new Consonant(parts[j].chars.concat([char]), this, cType);
              success = true;
              break;
            }
          }
          if (!success) {
            parts.push(new HebrewMark([char], this));
          }
        }
        // Add a niqqud character which is not a sheva nah (a non-vocal sheva,
        // i.e. a sheva not in the first cluster) as a new Vowel, and add a
        // sheva nah as a new HebrewMark
        else if (char.sequencePosition === 3) {
          if (char.text === "\u{05B0}" && i > 0) {
            parts.push(new HebrewMark([char], this));
          } else {
            parts.push(new Vowel([char], this));
            seenVowel = true;
          }
        }
        // Add any other Hebrew character as a new HebrewMark.
        //
        // NOTE: this deliberately tests `hebChars` rather than `char.isNotHebrew`. The
        // latter is `sequencePosition === 10`, i.e. "findPos had no category for this",
        // which is true of nine assigned Hebrew characters (maqaf, sof pasuq, paseq,
        // nun hafukha, geresh, gershayim, the upper/lower dots, and the masora circle)
        // since `taamim` was narrowed to [֑-֮]. Using it here would misfile
        // all of them as NonHebrew. `Cluster.isNotHebrew` tests the block directly, so
        // this keeps char- and cluster-level classification consistent within `parts`.
        else if (hebChars.test(char.text)) {
          parts.push(new HebrewMark([char], this));
        }
        // Add anything else as a new NonHebrew SyllablePart
        else {
          parts.push(new NonHebrew([char], this));
        }
      }
    }

    // Compute some conditions needed for the gemination check below
    let [hasNonShevaVowel, hasConsonantAfterVowel] = [false, false];
    for (const part of parts) {
      if (part instanceof Vowel && !/\u{05B0}/u.test(part.text)) {
        hasNonShevaVowel = true;
      } else if (hasNonShevaVowel && part instanceof Consonant) {
        hasConsonantAfterVowel = true;
      }
    }

    // If this is a non-final syllable, this syllable has a non-sheva vowel, the
    // syllable is open (i.e. there is no consonant after the vowel), and the
    // first cluster of the next syllable has a dagesh which is not part of a
    // shureq, then add the consonant and its dagesh from the next syllable as
    // an additional Consonant (marked as fromGemination)
    const next = this.next;
    if (
      !this.isFinal &&
      hasNonShevaVowel &&
      !hasConsonantAfterVowel &&
      next !== null &&
      next instanceof Syllable &&
      next.clusters.length > 0 &&
      /\u{05BC}/u.test(next.clusters[0].text) &&
      !next.clusters[0].isShureq
    ) {
      const geminated = new Consonant(
        next.clusters[0].chars.filter((c) => c.sequencePosition <= 2),
        this,
        "codaGeminatedConsonant"
      );
      return { parts: [...parts, geminated], partsNoGemination: parts };
    }

    return { parts, partsNoGemination: parts };
  }

  #resolveParts(): { parts: SyllablePart[]; partsNoGemination: SyllablePart[] } {
    if (this.#cachedParts && this.#cachedPartsNoGemination) {
      return { parts: this.#cachedParts, partsNoGemination: this.#cachedPartsNoGemination };
    }

    const built = this.#buildParts();

    // Only cache once the syllable is attached to a Word. Both `isFinal` (used for the
    // furtive patah) and `next` (used for gemination) read tree wiring that is set after
    // construction, so caching any earlier would freeze an incorrect result permanently.
    if (this.word) {
      this.#cachedParts = built.parts;
      this.#cachedPartsNoGemination = built.partsNoGemination;
    }

    return built;
  }

  static #toStructure(parts: SyllablePart[]): SyllableStructure {
    const onset: Consonant[] = [];
    const nucleus: Vowel[] = [];
    const coda: Consonant[] = [];

    for (const part of parts) {
      if (part instanceof Consonant) {
        if (nucleus.length === 0) {
          onset.push(part);
        } else {
          coda.push(part);
        }
      } else if (part instanceof Vowel) {
        if (coda.length !== 0) {
          throw new Error("Syllable contains a consonant between two vowels, i.e. does not have (C)V(C) structure");
        }
        nucleus.push(part);
      }
    }

    return [onset, nucleus, coda];
  }

  #resolveStructure(): { structure: SyllableStructure; structureNoGemination: SyllableStructure } {
    if (this.#cachedStructure && this.#cachedStructureNoGemination) {
      return { structure: this.#cachedStructure, structureNoGemination: this.#cachedStructureNoGemination };
    }

    const { parts, partsNoGemination } = this.#resolveParts();
    const structureNoGemination = Syllable.#toStructure(partsNoGemination);
    // When no gemination applies `#buildParts` returns the same array for both, so the
    // two structures are the same object too - no need to build it a second time
    const structure = parts === partsNoGemination ? structureNoGemination : Syllable.#toStructure(parts);

    if (this.word) {
      this.#cachedStructure = structure;
      this.#cachedStructureNoGemination = structureNoGemination;
    }

    return { structure, structureNoGemination };
  }

  /**
   * Gets the {@link SyllablePart | SyllableParts} which make up the syllable, i.e. its
   * {@link Consonant | Consonants}, {@link Vowel | Vowels}, {@link HebrewMark | HebrewMarks},
   * and {@link NonHebrew} characters
   *
   * @returns a one dimensional array of the parts of the syllable, in order
   *
   * @example
   * ```ts
   * const text = new Text("וּמַדּ֖וּעַ");
   * text.syllables.map((s) => s.parts.map((p) => [p.type, p.text]));
   * // [
   * //   [ [ 'V', 'וּ' ] ],
   * //   [ [ 'C', 'מ' ], [ 'V', 'ַ' ], [ 'C', 'דּ' ] ],
   * //   [ [ 'C', 'דּ' ], [ 'H', '֖' ], [ 'V', 'וּ' ] ],
   * //   [ [ 'V', 'ַ' ], [ 'C', 'ע' ] ]
   * // ]
   * ```
   */
  get parts(): SyllablePart[] {
    return this.#resolveParts().parts;
  }

  /**
   * Returns the new syllables resulting from replacing the Divine Name (tetragrammaton) with a substitution, by default either "Adonai" or "Elohim" depending on the niqqud
   *
   * @param repl the replacement to use, {@link adonaiOrElohim} by default (see also {@link doubleYod} and {@link hashem})
   * @returns the Syllables of the replacement, or just this Syllable if it is not read as the Divine Name (see {@link hasDivineName})
   *
   * @example
   * ```ts
   * const text = new Text("לַֽיהוָ֖ה");
   * text.syllables[0].replaceDivineName().map((syl) => syl.text);
   * // ["לַֽא", "דֹ", "נָ֖י"]
   * ```
   *
   * @remarks
   * Any prefix the Syllable is read with is kept, and the taamim are kept, being placed on the corresponding clusters of the replacement - see {@link DivineNameReplacement}.
   *
   * Although the returned syllables are themselves linked to this syllable's parent and siblings via {@link Node.parent}, {@link Node.next}, and {@link Node.prev}, this syllable's parent and its children are unchanged - meaning those connections are not reciprocated, unlike for all other {@link Node | Nodes} generated by this library.
   */
  replaceDivineName(repl: DivineNameReplacement = adonaiOrElohim): Syllable[] {
    const newText = replaceDivineName(this.text, repl);
    if (newText === this.text) {
      return [this];
    }
    if (!this.word) {
      return new Word(newText, {}).syllables;
    }
    // Link the new syllables to the current word
    const syls = new Word(newText, this.word.sylOpts).syllables;
    syls.forEach((syl) => (syl.parent = this.word));
    if (syls.length > 0) {
      syls[0].prev = this.prev;
      syls[syls.length - 1].next = this.next;
    }
    return syls;
  }

  /**
   * Gets the structure of the syllable
   *
   * @returns the structure of the Syllable, i.e. the syllable's onset, nucleus, and coda
   *
   * @example
   * ```ts
   * const text = new Text("וּמַדּ֖וּעַ");
   * text.syllables.map((s) => s.structure.map((st) => st.map((p) => p.text)));
   * // [
   * //   [ [], [ 'וּ' ], [] ],
   * //   [ [ 'מ' ], [ 'ַ' ], [ 'דּ' ] ],
   * //   [ [ 'דּ' ], [ 'וּ' ], [] ],
   * //   [ [], [ 'ַ' ], [ 'ע' ] ]
   * // ]
   * ```
   *
   * @remarks
   * - The onset is any initial consonant of the syllable - present in every syllable except those containing a except word-initial shureq or a furtive patah.
   * - The nucleus is the vowel of the syllable - present in every syllable and containing its {@link vowels} (with any materes lecticonis) or a shureq.
   * - The coda is all final consonants of the syllable - not including any matres lecticonis, and including the onset of the subsequent syllable if the subsequent syllable is geminated. See {@link codaNoGemination} to exclude the latter.
   *
   * Taamim and other marks are not part of the structure; they are {@link HebrewMark} parts - see {@link parts}.
   *
   * @throws if the syllable does not have `(C)V(C)` structure, i.e. if a consonant separates two vowels
   */
  get structure(): SyllableStructure {
    return this.#resolveStructure().structure;
  }

  /**
   * Gets all the taamim characters in the Syllable
   *
   * @returns a one dimensional array of taamim characters in the syllable
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.syllables[1].taamim;
   * // ["\u{596}"]
   * ```
   */
  get taamim() {
    return this.clusters.map((c) => c.taamim).flat();
  }

  /**
   * Gets all the taamim names in the Syllable
   *
   * @returns a one dimensional array of taamim names in the syllable
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.syllables[1].taamimNames;
   * // ["TIPEHA"]
   * ```
   */
  get taamimNames() {
    return this.clusters.map((c) => c.taamimNames).flat();
  }

  /**
   * The text of the syllable
   *
   * @returns the sequenced and normalized text of the syllable
   *
   * @example
   * ```ts
   * const text = new Text("וַיִּקְרָ֨א");
   * text.syllables.map((syl) => syl.text);
   * //  [
   * //    "וַ"
   * //    "יִּקְ"
   * //    "רָ֨א"
   * //  ]
   * ```
   *
   * @remarks
   * This returns a string that has been built up from the .text of its constituent Clusters.
   */
  get text() {
    return this.clusters.map((c) => c.text).join("");
  }

  /**
   * Gets the names of the vowel characters in the syllable
   *
   * @returns an array of names of vowel characters in the syllable
   *
   * @example
   * ```ts
   * const text = new Text("מִתָּ֑͏ַ֜חַת");
   * text.syllables[1].vowelNames;
   * // ["QAMATS", "PATAH"]
   * ```
   *
   * @remarks
   * This returns an array of names of vowel characters in the syllable, but not for mater lectionis (e.g. a holam vav would return the HOLAM, not the vav).
   * The only exception is a shureq, which returns "SHUREQ" because there is no vowel character for a shureq.
   * It is very uncommon to have multiple vowel characters in a syllable.
   * According to [Syllabification](/guides/syllabification), a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character.
   */
  get vowelNames() {
    if (this.#vowelNamesCache) {
      return this.#vowelNamesCache;
    }

    const vowelNames = this.vowels
      .reduce((a, vowel) => {
        if (sylVowelCharToNameMap[vowel]) {
          a.push(sylVowelCharToNameMap[vowel]);
        }
        return a;
      }, [] as SyllableVowelName[])
      .flat();

    return (this.#vowelNamesCache = vowelNames);
  }

  /**
   * Gets the vowel characters of the syllable
   *
   * @returns an array of vowel characters in the syllable
   *
   * @example
   * ```ts
   * const text = new Text("מִתָּ֑͏ַ֜חַת");
   * text.syllables[1].vowels;
   * // ["\u{05B8}", "\u{05B7}"]
   * ```
   *
   * @remarks
   * This returns a single vowel character, even for most mater lectionis (e.g. a holam vav would return the holam, not the vav).
   * The only exception is a shureq, which returns the vav and the dagesh because there is no vowel character for a shureq.
   * It is very uncommon to have multiple vowel characters in a syllable.
   * According to [Syllabification](/guides/syllabification), a sheva is a vowel and serves as the nucleus of a syllable.
   * Unlike `Cluster`, a `Syllable` is concerned with linguistics, so a sheva **is** a vowel character
   */
  get vowels() {
    if (this.#vowelsCache) {
      return this.#vowelsCache;
    }
    // the nucleus returns as many Vowels as there are in the syllable, and unlike the old
    // string-based nucleus it already excludes taamim, so no removeTaamim call is needed
    const shureq = sylVowelNameToCharMap.SHUREQ;
    const vowels = this.nucleus.reduce((a, vowel) => {
      // a shureq has no vowel character of its own - it is the vav plus its dagesh
      if (vowel.text.includes(shureq)) {
        a.push(shureq);
        return a;
      }
      // otherwise take the vowel character(s), skipping any mater consonant
      for (const char of vowel.text) {
        if (this.#isCharKeyOfSyllableVowelCharToNameMap(char)) {
          a.push(char);
        }
      }
      return a;
    }, [] as SyllableVowel[]);

    return (this.#vowelsCache = vowels);
  }

  /**
   * Gets the {@link Word} to which the syllable belongs
   *
   * @returns the `Word` to which the syllable belongs
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.syllables[0].word;
   * // Word {
   * //   text: "הָאָ֖רֶץ"
   * // }
   * ```
   */
  get word() {
    return this.parent?.value ?? null;
  }
}
