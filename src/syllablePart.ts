/* eslint max-classes-per-file: 0, no-shadow: 0 */
import { Char } from "./char";
import { Syllable } from "./syllable";

export enum SyllablePartType {
  consonant = "C",
  vowel = "V",
  hebrewMark = "H",
  nonHebrew = "N"
}

/**
 * A part of a [[`Syllable`]], i.e. either a [[`Consonant`]], a [[`Vowel`]], [[`HebrewMark`]], or a [[`NonHebrew`]] character.
 */
export abstract class SyllablePart {
  #chars: Char[];
  #syllable: Syllable | null = null;

  constructor(chars: Char[]) {
    this.#chars = chars;
  }

  /**
   * @returns the type of the SyllablePart
   *
   * ```typescript
   * const text: Text = new Text("שֶׁל");
   * text.syllables[0].parts.map((p) => p.type)
   * // [ 'C', 'V', 'C' ]
   * ```
   */
  abstract get type(): SyllablePartType;

  /**
   * @returns the text of the SyllablePart
   *
   * ```typescript
   * const text: Text = new Text("שֶׁל");
   * text.syllables[0].parts[0].text;
   * // "שׁ"
   * ```
   */
  get text(): string {
    return this.chars.reduce((init, char) => init + char.text, "");
  }

  /**
   * @returns an array of sequenced Char objects
   *
   * ```typescript
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
   * The parent `Syllable` of the `SyllablePart`, if any.
   *
   * ```typescript
   * const text: Text = new Text("דָּבָר");
   * const secondConsonant = text.syllables[1].parts[0];
   * secondConsonant.text;
   * // "ב"
   * secondConsonant.syllable?.text;
   * // "בָר"
   * ```
   */
  get syllable(): Syllable | null {
    return this.#syllable;
  }

  set syllable(syllable: Syllable | null) {
    this.#syllable = syllable;
  }
}

export enum ConsonantType {
  onsetConsonant = "OC",
  codaConsonant = "CC",
  codaGeminatedConsonant = "CGC"
}

/**
 * A part of a syllable which is a Hebrew consonant, including:
 * - Whether the consonant is part of the syllable's coda (or otherwise, onset)
 * - Whether it is from gemination of the first consonant of the following syllable
 */
export class Consonant extends SyllablePart {
  #type: SyllablePartType.consonant = SyllablePartType.consonant;
  #consonantType: ConsonantType;

  constructor(chars: Char[], consonantType: ConsonantType) {
    super(chars);
    this.#consonantType = consonantType;
  }

  get type(): SyllablePartType.consonant {
    return this.#type;
  }

  get consonantType(): ConsonantType {
    return this.#consonantType;
  }

  get partOfOnset(): boolean {
    return this.#consonantType == ConsonantType.onsetConsonant;
  }

  get partOfCoda(): boolean {
    return this.#consonantType != ConsonantType.onsetConsonant;
  }

  /**
   * Returns `true` if this consonant comes from gemination of first consonant of the following syllable
   *
   * ```typescript
   * const text: Text = new Text("שַׁבָּת");
   * text.syllables.map((s) => s.structure.map((st) => st.map((p) => p.text)))
   * // [
   * //   [ [ 'שׁ' ], [ 'ַ' ], [ 'בּ' ] ],
   * //   [ [ 'בּ' ], [ 'ָ' ], [ 'ת' ] ]
   * // ]
   * text.syllables[0].structure[2][0].fromGemination
   * // true
   * ```
   */
  get fromGemination(): boolean {
    return this.#consonantType == ConsonantType.codaGeminatedConsonant;
  }
}

/**
 * A part of a syllable which is a Hebrew vowel
 */
export class Vowel extends SyllablePart {
  #type: SyllablePartType.vowel = SyllablePartType.vowel;

  get type(): SyllablePartType.vowel {
    return this.#type;
  }
}

/**
 * A part of a syllable which is a Hebrew mark that is neither a consonant or a vowel
 */
export class HebrewMark extends SyllablePart {
  #type: SyllablePartType.hebrewMark = SyllablePartType.hebrewMark;

  get type(): SyllablePartType.hebrewMark {
    return this.#type;
  }
}

/**
 * A part of a syllable which is a non-Hebrew character
 */
export class NonHebrew extends SyllablePart {
  #type: SyllablePartType.nonHebrew = SyllablePartType.nonHebrew;

  get type(): SyllablePartType.nonHebrew {
    return this.#type;
  }
}
