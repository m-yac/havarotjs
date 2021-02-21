import { Word } from "./word";
import { convertsQametsQatan } from "./utils/qametsQatan";
import { sequence } from "./utils/sequence";
import { holemWaw } from "./utils/holemWaw";
import { Syllable } from "./syllable";
import { Cluster } from "./cluster";
import { Char } from "./char";
import { splitGroup } from "./utils/regularExpressions";
import { Node } from "./node";

export interface SylOpts {
  /**
   * @property determines whether to regard the shewa under the letters שׁשׂסצנמלוי when preceded by a waw-consecutive with a missing dagesh chazaq as vocal
   */
  sqnmlvy?: boolean;
  /**
   * @property determines whether to regard a shewa after a long vowel (excluding vav-shureq) as vocal
   */
  longVowels?: boolean;
  /**
   * @property determines whether to regard a shewa after a vav-shureq as vocal, unless metheg is present
   */
  wawShureq?: boolean;
  /**
   * @property converts regular qamets characters to qamets qatan characters where appropriate
   */
  qametsQatan?: boolean;
  schema?: Schema;
}

type Schema = "tiberian" | "traditional";

export class Text extends Node {
  original: string;
  private options: SylOpts;

  constructor(text: string, options: SylOpts = {}) {
    super();
    this.original = this.validateInput(text);
    this.options = this.setOptions(options);
  }

  private validateInput(text: string): string {
    const niqqud = /[\u{05B0}-\u{05BC},\u{05C7}]/u;
    if (!niqqud.test(text)) {
      throw new Error("Text must contain niqqud");
    }
    return text;
  }

  private setOptions(options: SylOpts): SylOpts {
    const schema = options.schema;
    return schema ? this.setSchemaOptions(schema) : this.setDefaultOptions(options);
  }

  private setSchemaOptions(schema: Schema): SylOpts {
    const traditionalOpts = { qametsQatan: true, sqnmlvy: true, longVowels: true, vavShureq: true };
    const tiberianOpts = { qametsQatan: false, sqnmlvy: true, longVowels: false, vavShureq: false };
    return schema === "traditional" ? traditionalOpts : tiberianOpts;
  }

  private setDefaultOptions(options: SylOpts): SylOpts {
    const defaultOpts: SylOpts = { qametsQatan: true, sqnmlvy: true, longVowels: true, wawShureq: true };
    // for..in throwing error
    defaultOpts.longVowels = options.longVowels !== undefined ? options.longVowels : defaultOpts.longVowels;
    defaultOpts.qametsQatan = options.qametsQatan !== undefined ? options.qametsQatan : defaultOpts.qametsQatan;
    defaultOpts.sqnmlvy = options.sqnmlvy !== undefined ? options.sqnmlvy : defaultOpts.sqnmlvy;
    defaultOpts.wawShureq = options.wawShureq !== undefined ? options.wawShureq : defaultOpts.wawShureq;
    return defaultOpts;
  }

  private get normalized(): string {
    return this.original.normalize("NFKD");
  }

  private get sanitized(): string {
    const text = this.normalized.trim();
    const sequencedChar = sequence(text).reduce((a, c) => a.concat(c), []);
    const sequencedText = sequencedChar.reduce((a, c) => a + c.text, "");
    // split text at spaces and maqqef, spaces are added to the array as separate entries
    const textArr = sequencedText.split(splitGroup);
    const mapQQatan = this.options.qametsQatan ? textArr.map((word) => convertsQametsQatan(word)) : textArr;
    const mapHolemWaw = mapQQatan.map((word) => holemWaw(word));
    return mapHolemWaw.reduce((a, c) => a + c, "");
  }

  /**
   * @returns a string that has been decomposed, sequenced, qamets qatan patterns converted to the appropriate unicode character (U+05C7), and holem-waw sequences corrected
   */
  get text(): string {
    return this.words.reduce((a, c) => `${a}${c.text}${c.whiteSpaceAfter}`, "");
  }

  /**
   * @returns a one dimensional array of Words
   */
  get words(): Word[] {
    const split = this.sanitized.split(splitGroup);
    const groups = split.filter((group) => group);
    const words = groups.map((word) => new Word(word, this.options));
    this.children = words;
    return words;
  }

  /**
   * @returns a one dimensional array of Syllables
   */
  get syllables(): Syllable[] {
    return this.words.map((word) => word.syllables).reduce((a, c) => a.concat(c), []);
  }

  /**
   * @returns a one dimensional array of Clusters
   */
  get clusters(): Cluster[] {
    return this.syllables.map((syllable) => syllable.clusters).reduce((a, c) => a.concat(c), []);
  }

  /**
   * @returns a one dimensional array of Chars
   */
  get chars(): Char[] {
    return this.clusters.map((cluster) => cluster.chars).reduce((a, c) => a.concat(c), []);
  }
}
