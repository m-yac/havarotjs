import { Text, SylOpts } from "./text";
import { Word } from "./word";
import { Syllable } from "./syllable";
import { SyllablePart, Consonant, Vowel, HebrewMark, NonHebrew } from "./syllablePart";
import { punctuation, taamim } from "./utils/regularExpressions";
import { adonaiOrElohim, DivineNameReplacement } from "./utils/replaceDivineName";

const taamimOrPunct = new RegExp(`[${taamim.source.slice(1, -1)}\\u05BD${punctuation.source.slice(1, -1)}]`, "u");

export abstract class TransliterationScheme {
  debug = false;
  // U+034F COMBINING GRAPHEME JOINER is invisible, does not get reordered by
  // normalization, and is otherwise unused - so we use it as our internal marker for
  // where to capitalize
  capitalizationMarker: string = "\u034F";
  abstract get syllabificationOptions(): SylOpts;
  abstract get syllableSeparator(): string;
  abstract get gemination(): boolean;
  abstract get consonants(): { [fromStart: string]: string };
  abstract get vowels(): { [fromStart: string]: string };
  abstract get divineName(): DivineNameReplacement;
  abstract consonantExceptions(c: Consonant): string | undefined;
  abstract vowelExceptions(c: Vowel, txt: string): string | undefined;
  abstract preprocess(he: string): string;
  abstract postprocess(trl: string): string;

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
      const text = new Text(x, this.syllabificationOptions).replaceDivineName(this.divineName);
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
      return x.syllables.map((s) => this.trl(s)).join(this.syllableSeparator);
    }
    if (x instanceof Syllable) {
      this.log("- syllable:", x.text);
      return x.parts.map((p) => this.trl(p)).join("");
    }
    if (x instanceof Consonant) {
      this.log("- + consonant:", x.text);
      if (x.fromGemination && !this.gemination) {
        return "";
      }
      const exn = this.consonantExceptions(x);
      if (exn !== undefined) {
        return exn;
      }
      const txt = x.text;
      for (let n = txt.length; n > 0; n--) {
        const s = this.consonants[txt.slice(0, n)];
        if (s !== undefined) {
          return s;
        }
      }
      throw new Error(`Unhandled consonant: ${x.text}`);
    }
    if (x instanceof Vowel) {
      const txt = "א" + x.text;
      this.log("- + vowel:", txt);
      const exn = this.vowelExceptions(x, txt);
      if (exn !== undefined) {
        return exn;
      }
      const txtNoHolemHaserVav = txt.replaceAll("\u05BA", "\u05B9");
      const txts = txt === txtNoHolemHaserVav ? [txt] : [txt, txtNoHolemHaserVav];
      for (const t of txts) {
        for (let n = t.length; n > 1; n--) {
          const s = this.vowels[t.slice(0, n)];
          if (s !== undefined) {
            return s;
          }
        }
      }
      throw new Error(`Unhandled vowel: ${x.text}`);
    }
    if (x instanceof HebrewMark) {
      this.log("- + mark:", "א" + x.text);
      return taamimOrPunct.test(x.text) ? x.text : "";
    }
    if (x instanceof NonHebrew) {
      return x.text;
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
  #gemination = false;
  // prettier-ignore
  #consonants: { [fromStart: string]: string } = {
    א: "",
    בּ: "b", ב: "v",
    ג: "g",
    ד: "d",
    ה: "h",
    ו: "v",
    ז: "z",
    ח: "ch",
    ט: "t",
    י: "y",
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
  };
  // prettier-ignore
  #vowels: { [fromStart: string]: string } = {
    אְ: "’", אֲ: "a", אַ: "a", אָ: "a", אָה: "a",
    אֱ: "e", אֶ: "e", אֶה: "e", אֵ: "ei", אֵה: "ei",
    אֵי: "ei",
    אִ: "i", אִי: "i",
    אֳ: "o", אׇ: "o", אֹ: "o", אֹו: "o",
    אֻ: "u", אוּ: "u"
  };
  #divineName: DivineNameReplacement = adonaiOrElohim;

  consonantExceptions(c: Consonant): string | undefined {
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
      return "";
    }
    return undefined;
  }

  // params are required by the abstract signature but unused while the body is commented out
  /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
  vowelExceptions(_v: Vowel, _txt: string): string | undefined {
    // // Final "אָה" as "ah"
    // if (_txt === "אָה" && _v.syllable && _v.syllable.isFinal && _v.syllable.coda.length === 0) {
    //   return "ah";
    // }
    return undefined;
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

  get gemination(): boolean {
    return this.#gemination;
  }

  get consonants(): { [fromStart: string]: string } {
    return this.#consonants;
  }

  get vowels(): { [fromStart: string]: string } {
    return this.#vowels;
  }

  get divineName(): DivineNameReplacement {
    return this.#divineName;
  }
}
