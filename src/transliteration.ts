import { Text, SylOpts } from "./text";
import { Word } from "./word";
import { Syllable } from "./syllable";
import { SyllablePart, Consonant, Vowel, HebrewMark, NonHebrew } from "./syllablePart";
import { taamim, vowelsWithSheva } from "./utils/regularExpressions";

const taamimOrMeteg = /[\u0590-\u05AF\u05BD\u05C4\u05C5]/u;

type DivineNameEntry = { clusters: [string, string, string, string],
                         withPrefixCluster: string };


abstract class TransliterationScheme {
  debug = false;
  abstract get capitalizationMarker(): string;
  abstract get syllabificationOptions(): SylOpts;
  abstract get syllableSeparator(): string;
  abstract get gemination(): boolean;
  abstract get consonants(): { [fromStart: string]: string };
  abstract get vowels(): { [fromStart: string]: string };
  abstract get divineName(): DivineNameEntry | { adonai: DivineNameEntry,
                                                 elohim: DivineNameEntry };
  abstract consonantExceptions(c: Consonant): string | undefined;
  abstract vowelExceptions(c: Vowel, txt: string): string | undefined;
  abstract preprocess(he: string): string;
  abstract postprocess(trl: string): string;

  replaceDivineName(s: string, opts: { readonly hasPrefix: boolean,
                                       readonly isElohim: boolean }): string {
    // Build the regular expression string
    let sRe = ""
    if (opts.hasPrefix) {
      sRe += "([בכל]\u05BC?" + vowelsWithSheva.source + "?" + taamimOrMeteg.source + "?)";
    }
    sRe += "י" + vowelsWithSheva.source + "?(" + taamimOrMeteg.source + ")?";
    sRe += "ה" + vowelsWithSheva.source + "?(" + taamimOrMeteg.source + ")?";
    sRe += (opts.isElohim ? "וִ" : "ָו")  + "?(" + taamimOrMeteg.source + ")?";
    sRe += "ה" + vowelsWithSheva.source + "?(" + taamimOrMeteg.source + ")?";

    // Build the replacement string
    const entry = opts.isElohim &&
                  "elohim" in this.divineName ? this.divineName.elohim :
                  "adonai" in this.divineName ? this.divineName.adonai
                                               : this.divineName;
    let sRp = " " + this.capitalizationMarker;
    let i = 1;
    if (opts.hasPrefix) {
      sRp += `$${i++}`;
    }
    sRp += (opts.hasPrefix ? entry.withPrefixCluster :
             entry.clusters[0]) + `$${i++}`;
    sRp +=  entry.clusters[1]  + `$${i++}`;
    sRp +=  entry.clusters[2]  + `$${i++}`;
    sRp +=  entry.clusters[3]  + `$${i++}`;

    return s.replace(new RegExp(sRe, "gu"), sRp);
  }

  trl(x: string | Text | Word | Syllable | SyllablePart): string {
    if (typeof x === "string") {
      // Remove extra whitespace
      x = x.replace(new RegExp("  +", "g"), " ");
      // Handle transliterating the divine name as "adonai" or "elohim"
      x = this.replaceDivineName(x, {hasPrefix: true,  isElohim: true });
      x = this.replaceDivineName(x, {hasPrefix: true,  isElohim: false});
      x = this.replaceDivineName(x, {hasPrefix: false, isElohim: true });
      x = this.replaceDivineName(x, {hasPrefix: false, isElohim: false});
      // Do any additional preprocessing
      x = this.preprocess(x);

      // Syllabify and transliterate
      let trl = this.trl(new Text(x, this.syllabificationOptions));

      // Capitalize anything immediately after the capitalization marker
      if (this.capitalizationMarker.length > 0) {
        const capEsc = this.capitalizationMarker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const capRe = `${capEsc}([^${this.syllableSeparator}\\s]*)([a-z])`;
        trl = trl.replace(new RegExp(capRe, "g"), (_, m1, m2) => m1 + m2.toUpperCase())
      }
      // Do any additional postprocessing
      trl = this.postprocess(trl);

      return trl;
    }
    if (x instanceof Text) {
      return x.words.reduce((s, wd) => s + this.trl(wd) + wd.whiteSpaceAfter, "");
    }
    if (x instanceof Word) {
      if (this.debug) console.log("Word:", x.text);
      return x.syllables.map((s) => this.trl(s)).join(this.syllableSeparator);
    }
    if (x instanceof Syllable) {
      if (this.debug) console.log("- syllable:", x.text);
      return x.parts.map((p) => this.trl(p)).join("");
    }
    if (x instanceof Consonant) {
      if (this.debug) console.log("- + consonant:", x.text);
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
      if (this.debug) console.log("- + vowel:", txt);
      const exn = this.vowelExceptions(x, txt);
      if (exn !== undefined) {
        return exn;
      }
      const txtNoHolemHaserVav = txt.replaceAll("\u05BA", "\u05B9");
      const txts = [txt] + txt == txtNoHolemHaserVav ? [] : [txtNoHolemHaserVav];
      for (let i = 0; i < txts.length; i++) {
        for (let n = txts[i].length; n > 1; n--) {
          const s = this.vowels[txts[i].slice(0, n)];
          if (s !== undefined) {
            return s;
          }
        }
      }
      throw new Error(`Unhandled vowel: ${x.text}`);
    }
    if (x instanceof HebrewMark) {
      if (this.debug) console.log("- + mark:", "א" + x.text);
      return taamim.test(x.text) || x.text == "\u05BD" ? x.text : "";
      // throw new Error("Implement trl(HebrewMark)");
    }
    if (x instanceof NonHebrew) {
      return x.text;
      // throw new Error("Implement trl(NonHebrew)");
    }
    throw new Error(`Unable to handle: ${x}`);
  }
}

class DefaultTransliterationScheme extends TransliterationScheme {
  #capitalizationMarker: string = "^";
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
  #divineName: { adonai: DivineNameEntry, elohim: DivineNameEntry } = {
    adonai: {
      withPrefixCluster: "א",
      clusters: ["אֲ", "דֹ", "נָ", "י"]
    },
    elohim: {
      withPrefixCluster: "א",
      clusters: ["אֱ", "לֹ", "הִ", "ים"]
    },
  }

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

  vowelExceptions(v: Vowel, txt: string): string | undefined {
    // // Final "אָה" as "ah"
    // if (txt === "אָה" && v.syllable && v.syllable.isFinal && v.syllable.coda.length === 0) {
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
    trl = trl.replace(new RegExp("(׃ )([a-z])", "g"), (_, m1, m2) => m1 + m2.toUpperCase())
    // Add a space after a maqaf
    trl = trl.replaceAll("־", "־ ");
    return trl;
  }

  get capitalizationMarker(): string {
    return this.#capitalizationMarker;
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

  get divineName(): { adonai: DivineNameEntry, elohim: DivineNameEntry } {
    return this.#divineName;
  }
}

// If this file is run as a script, transliterate the given input
if (process !== undefined && process.argv !== undefined && process.argv[1].endsWith("transliteration.ts")) {
  const input = process.argv[2];
  const ts = new DefaultTransliterationScheme();
  try {
    const pageData = JSON.parse(input) as string[][][];
    console.log(JSON.stringify(pageData.map(function (lineData, i) {
      return lineData.map(function (textData, j) {
        return textData.map(function (text, k) {
          return ts.trl(text);
        })
      })
    })));
  } catch (_) {
    console.log(JSON.stringify(ts.trl(input)));
  }
}
