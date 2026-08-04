import { Text, SylOpts } from "./text";
import { Word } from "./word";
import { Syllable, SyllableMap } from "./syllable";
import { Consonant, SyllablePart, SyllablePartMap } from "./syllablePart";
import { punctuation, taamim } from "./utils/regularExpressions";
import { adonaiOrElohim, DivineNameReplacement } from "./utils/divineName";

const taamimOrPunct = new RegExp(`[${taamim.source.slice(1, -1)}\\u05BD${punctuation.source.slice(1, -1)}]`, "u");

export type TransliterationMap = SyllableMap<string> & SyllablePartMap<string>;

export abstract class TransliterationScheme {
  #syllableMap?: TransliterationMap;

  debug = false;
  // U+034F COMBINING GRAPHEME JOINER is invisible, does not get reordered by
  // normalization, and is otherwise unused - so we use it as our internal marker for
  // where to capitalize
  capitalizationMarker: string = "\u034F";
  abstract get syllabificationOptions(): SylOpts;
  abstract get syllableSeparator(): string;
  abstract get syllablePartMap(): SyllablePartMap<string>;
  abstract get divineName(): DivineNameReplacement;
  abstract preprocess(he: string): string;
  abstract postprocess(trl: string): string;

  /**
   * The scheme's {@link syllablePartMap} extended into a {@link TransliterationMap} by
   * concatenating the transliterations of a syllable's parts, and joining those of a
   * word's syllables with the {@link syllableSeparator}
   */
  get syllableMap(): TransliterationMap {
    this.#syllableMap ??= {
      ...this.syllablePartMap,
      onSyllablePart: (acc, p) => (acc ?? "") + (p !== undefined ? this.trl(p) : ""),
      onSyllable: (acc, s) =>
        (acc !== undefined ? acc + this.syllableSeparator : "") + (s !== undefined ? this.trl(s) : ""),
      divineName: this.divineName
    };
    return this.#syllableMap;
  }

  private log(...args: unknown[]): void {
    if (this.debug) {
      console.log(...args);
    }
  }

  trl(x: string | Text | Word | Syllable | SyllablePart): string {
    if (typeof x === "string") {
      // Remove extra whitespace
      x = x.replace(new RegExp("  +", "g"), " ");
      // Do any additional preprocessing
      x = this.preprocess(x);

      // Transliterate
      const text = new Text(x, this.syllabificationOptions);
      let trl = this.trl(text);

      // Capitalize the last letter preceding the capitalization marker
      const capRe = `([a-z])([^a-z\\s${this.syllableSeparator}]*)${this.capitalizationMarker}`;
      trl = trl.replace(new RegExp(capRe, "g"), (_: string, m1: string, m2: string) => m1.toUpperCase() + m2);
      // Remove any remaining capitalization markers
      trl = trl.replaceAll(this.capitalizationMarker, "");
      // Do any additional postprocessing
      trl = this.postprocess(trl);

      return trl;
    }
    if (x instanceof Text) {
      return x.words.reduce((s, wd) => s + this.trl(wd) + (wd.whiteSpaceAfter ?? ""), "");
    }
    if (x instanceof Word) {
      this.log("Word:", x.text);
      return x.apply(this.syllableMap);
    }
    if (x instanceof Syllable) {
      this.log("- syllable:", x.text);
      return x.apply(this.syllableMap);
    }
    if (x instanceof SyllablePart) {
      this.log(`- + ${x.kind}:`, x.text);
      return x.apply(this.syllableMap);
    }
    throw new Error(`Unable to handle: ${JSON.stringify(x)}`);
  }
}

export class DefaultTransliterationScheme extends TransliterationScheme {
  #syllabificationOptions: SylOpts = {
    allowNoNiqqud: true,
    article: true,
    longVowels: false,
    shevaAfterMeteg: false,
    sqnmlvy: true,
    wawShureq: false
  };
  #syllableSeparator = "·";
  // prettier-ignore
  #syllablePartMap: SyllablePartMap<string> = {
    onConsonant: {
      א: "",
      בּ: "b", ב: "v",
      ג: "g",
      ד: "d",
      ה: "h",
      ו: "v",
      ז: "z",
      ח: "ch",
      ט: "t",
      י: (c) => this.yod(c),
      כּ: "k", ךּ: "k", כ: "ch", ך: "ch",
      ל: "l",
      מ: "m", ם: "m",
      נ: "n", ן: "n",
      ס: "s",
      ע: "",
      פּ: "p", ףּ: "p", פ: "f", ף: "f",
      צ: "tz", ץ: "tz",
      ק: "k",
      ר: "r",
      ש: "sh", שׁ: "sh", שׂ: "s",
      ת: "t"
    },
    // Gemination is not represented, so drop every geminated consonant
    onGeminatedConsonant: {
      "": ""
    },
    onVowel: {
      אְ: "’", אֲ: "a", אַ: "a", אָ: "a", אָה: "a",
      אֱ: "e", אֶ: "e", אֶה: "e", אֵ: "ei", אֵה: "ei",
      אֵי: "ei",
      אִ: "i", אִי: "i",
      // holem haser for vav (U+05BA) is treated just like holem (U+05B9)
      אֳ: "o", אׇ: "o", אֹ: "o", אֹו: "o", אֺ: "o", אֺו: "o",
      אֻ: "u", אוּ: "u"
    },
    onHebrewMark: {
      // Delete anything that's not taamim or punctuation, keep the rest as is
      "": (m) => (taamimOrPunct.test(m.text) ? m.text : "")
    },
    onNonHebrew: {
      // Keep all non-Hebrew characters as they are
      "": (n) => n.text
    }
  };
  #divineName: DivineNameReplacement = adonaiOrElohim;

  /**
   * The transliteration of a yod, which is treated as part of the preceding vowel in
   * certain contexts
   */
  private yod(c: Consonant): string {
    if (c.text === "י" && c.partOfCoda && c.syllable) {
      // "ין" suffix as "v" instead of "yv"
      if (c.syllable.coda.length === 2 && c.syllable.coda[1].text === "ו") {
        return "";
      }
      // "אֲי"/"אַי"/"אָי" as "ai" instead of "ay"
      const nucleus = c.syllable.nucleus;
      if (nucleus.length > 0 && this.trl(nucleus.slice(-1)[0]) === "a") {
        return "i";
      }
    }
    return "y";
  }

  preprocess(he: string): string {
    // No additional preprocessing needed
    return he;
  }

  postprocess(trl: string): string {
    // Capitalize the first letter of any verse
    trl = trl.replace(new RegExp("(׃ )([a-z])", "g"), (_: string, m1: string, m2: string) => m1 + m2.toUpperCase());
    // Add a space after a maqaf
    trl = trl.replaceAll("־", "־ ");
    return trl;
  }

  get syllabificationOptions(): SylOpts {
    return this.#syllabificationOptions;
  }

  get syllableSeparator(): string {
    return this.#syllableSeparator;
  }

  get syllablePartMap(): SyllablePartMap<string> {
    return this.#syllablePartMap;
  }

  get divineName(): DivineNameReplacement {
    return this.#divineName;
  }
}
