import { Cluster } from "./cluster";
import { Node } from "./node";
import type { SyllableVowelName } from "./syllable";
import { Syllable } from "./syllable";
import { SylOpts, Text } from "./text";
import type { ConsonantName, TaamimName } from "./utils/charMap";
import type { DivineNameForm, DivineNameReplacement } from "./utils/divineName";
import { adonaiOrElohim, divineNameForm, findDivineNameStart, replaceDivineName } from "./utils/divineName";
import { clusterSplitGroup, jerusalemTest } from "./utils/regularExpressions";
import { setIsClosed, syllabify } from "./utils/syllabifier";

/**
 * A subunit of a {@link Text} consisting of words, which are strings are text separated by spaces or maqqefs.
 */
export class Word extends Node<Word, Text> {
  #text: string;
  #original: string;
  /**
   * The white space that appears before the word
   *
   * @returns any white space that appears before the word such as a space or new line
   *
   * @example
   * ```ts
   * const heb = `
   * עֶבֶד
   * אֱלֹהִים
   * `;
   * const text = new Text(heb);
   * text.words;
   * // [
   * //   Word {
   * //     original: 'עֶבֶד\n',
   * //     text: 'עֶבֶד',
   * //     whiteSpaceBefore: '',
   * //     whiteSpaceAfter: '\n'
   * //   },
   * //   Word {
   * //     original: 'אֱלֹהִים',
   * //     text: 'אֱלֹהִים',
   * //     whiteSpaceBefore: '',
   * //     whiteSpaceAfter: ''
   * //   }
   * // ]
   * ```
   */
  whiteSpaceBefore: string | null;
  /**
   * The white space that appears after the word
   *
   * @returns any white space that appears after the word such as a space or new line
   *
   * @example
   * ```ts
   * const heb = `
   * עֶבֶד
   * אֱלֹהִים
   * `;
   * const text = new Text(heb);
   * text.words;
   * // [
   * //   Word {
   * //     original: 'עֶבֶד\n',
   * //     text: 'עֶבֶד',
   * //     whiteSpaceBefore: '',
   * //     whiteSpaceAfter: '\n'
   * //   },
   * //   Word {
   * //     original: 'אֱלֹהִים',
   * //     text: 'אֱלֹהִים',
   * //     whiteSpaceBefore: '',
   * //     whiteSpaceAfter: ''
   * //   }
   * // ]
   * ```
   */
  whiteSpaceAfter: string | null;
  #sylOpts: SylOpts;
  #syllablesCache: Syllable[] | null = null;

  constructor(text: string, sylOpts: SylOpts, original?: string) {
    super();
    this.value = this;
    this.#text = text;
    this.#original = original ?? text;
    const startMatch = text.match(/^\s*/g);
    const endMatch = text.match(/\s*$/g);
    this.whiteSpaceBefore = startMatch ? startMatch[0] : null;
    this.whiteSpaceAfter = endMatch ? endMatch[0] : null;
    this.#sylOpts = sylOpts;
  }

  /**
   *
   * @param word the word to be split into Cluster
   *
   * @remarks
   * Splits a word at each consonant or the punctuation character, Sof Pasuq and Nun Hafukha
   */
  #makeClusters(word: string) {
    const match = word.match(jerusalemTest);
    /**
     * The Masoretic spelling of Jerusalem contains some idiosyncrasies,
     * namely the final syllable.
     * Due to the normalization process, this word requires special treatment
     */
    if (match?.groups) {
      const captured = match[0];
      const { hiriq, vowel, taamimMatch, mem } = match.groups;
      const partial = word.replace(captured, `${vowel}${taamimMatch}`);
      return [...partial.split(clusterSplitGroup), `${hiriq}${mem}`].map((group) => {
        if (group === `${hiriq}${mem}`) {
          return new Cluster(group, true);
        }
        return new Cluster(group);
      });
    }
    return word.split(clusterSplitGroup).map((group) => new Cluster(group));
  }

  /**
   *
   * @param nameStart the index in the word at which the Divine Name is read as a unit (see {@link findDivineNameStart})
   *
   * @remarks
   * The Divine Name does not follow the rules of Hebrew syllabification, so it is read as a single syllable,
   * but the prefixes preceding it are syllabified as usual.
   */
  #divineNameSyllables(nameStart: number) {
    const clusters = this.clusters;
    let clusterIdx = 0;
    for (let seenChars = 0; seenChars < nameStart; ) {
      seenChars += clusters[clusterIdx++].text.length;
    }

    // note that `syllabify` thinks it is being applied to a full word,
    // so we pass `true` to indicate the word is in construct form, which
    // will stop any accent weirdness (also see below)
    const prefixSyllables = clusterIdx ? syllabify(clusters.slice(0, clusterIdx), this.#sylOpts, true) : [];
    const nameSyllable = new Syllable(clusters.slice(clusterIdx));
    nameSyllable.clusters.forEach((cluster) => (cluster.parent = nameSyllable));

    const syllables = [...prefixSyllables, nameSyllable];
    const [first, ...rest] = syllables;
    first.siblings = rest;

    // another consequence of the fact that `syllabify` thought it was
    // being applied to a full word is that a final prefix with a vocal
    // sheva will be marked as closed, which we have to fix
    if (clusterIdx) {
      const finalPrefix = syllables[syllables.length - 2];
      finalPrefix.isClosed = false;
      setIsClosed(finalPrefix, syllables.length - 2, syllables);
    }

    syllables.forEach((syl) => (syl.parent = this));
    return syllables;
  }

  /**
   * Gets all the {@link Char | Characters} in the Word
   *
   * @returns a one dimensional array of Chars
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * text.words[0].chars;
   * // [
   * //    Char { original: "א" },
   * //    Char { original: "ֵ" }, (tsere)
   * //    Char { original: "פ" },
   * //    Char { original: "ֹ" }, (holem)
   * //    Char { original: "ה"},
   * //    Char { original: "־" }
   * //  ]
   * ```
   */
  get chars() {
    return this.clusters.map((cluster) => cluster.chars).flat();
  }

  /**
   * Gets all the {@link Cluster | Clusters} in the Word
   *
   * @returns a one dimensional array of Clusters
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * text.words[0].clusters;
   * // [
   * //    Cluster { original: "אֵ" },
   * //    Cluster { original: "י" },
   * //    Cluster { original: "פֹ" },
   * //    Cluster { original: "ה־" }
   * //  ]
   * ```
   */
  get clusters() {
    const clusters = this.#makeClusters(this.text);
    const firstCluster = clusters[0];
    const remainder = clusters.slice(1);
    firstCluster.siblings = remainder;
    return clusters;
  }

  /**
   * Gets all the consonant characters in the Word
   *
   * @returns a one dimensional array of all the consonant characters in the Word
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.words[0].consonants;
   * // ["ה", "א", "ר", "ץ"]
   * ```
   */
  get consonants() {
    return this.clusters.map((cluster) => cluster.consonants).flat();
  }

  /**
   * Gets all the consonant character names in the Word
   *
   * @returns a one dimensional array of all the consonant character names in the Word
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.words[0].consonantNames;
   * // ["HE", "ALEF", "RESH", "FINAL_TSADI"]
   * ```
   */
  get consonantNames() {
    return this.clusters.map((cluster) => cluster.consonantNames).flat();
  }

  /**
   * Gets the form of the Divine Name (i.e the tetragrammaton) that the word is, if any
   *
   * @returns the {@link DivineNameForm} of the word, or `null` if the word is not a form of the Divine Name
   *
   * @example
   * ```ts
   * const text = new Text("בַּֽיהוָ֔ה");
   * text.words[0].divineNameForm;
   * // { withPrefix: true, isElohim: false }
   * ```
   *
   * @remarks
   * A word is a form of the Divine Name if it consists of the four characters of the name, optionally preceded by prefixes (see {@link isPrefixedDivineName}).
   */
  get divineNameForm(): DivineNameForm | null {
    return divineNameForm(this.text);
  }

  /**
   * Checks if the word contains the consonant character of the name passed in
   *
   * @returns a boolean indicating if the word contains the consonant character of the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.words[0].hasConsonantName("HE");
   * // true
   * text.words[0].hasConsonantName("MEM");
   * // false
   * ```
   *
   * @remarks
   * This checks if the syllable contains the given consonant name, even if the character is not a phonemic consonant (i.e a mater).
   */
  hasConsonantName(name: ConsonantName): boolean {
    return this.clusters.some((cluster) => cluster.hasConsonantName(name));
  }

  /**
   * Checks if the word has a form of the Divine Name (i.e the tetragrammaton)
   *
   * @returns a boolean indicating if the word has a form of the Divine Name
   *
   * @example
   * ```ts
   * const text = new Text("בַּֽיהוָ֔ה");
   * text.words[0].hasDivineName;
   * // true
   * ```
   */
  get hasDivineName() {
    return this.divineNameForm !== null;
  }

  /**
   * Checks if the word contains the taamim character of the name passed in
   *
   * @returns a boolean indicating if the word contains the taamim character of the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.word[0].hasTaamName("TIPEHA");
   * // true
   * ```
   *
   * @remarks
   * Note: it only checks according to the character name, not its semantic meaning.
   * E.g. "כֵֽן׃" would be `true` when checking for `"METEG"`, not silluq
   */
  hasTaamName(name: TaamimName) {
    return this.syllables.some((syllable) => syllable.hasTaamName(name));
  }

  /**
   * Checks if the word contains the vowel character of the name passed in
   *
   * @returns a boolean indicating if the word contains the vowel character of the name passed in
   *
   * @example
   * ```ts
   * const text = new Text("הַיְחָבְרְךָ")'
   * text.word[0].hasVowelName("PATAH");
   * // true
   *
   * // test for vocal sheva
   * text.word[0].hasVowelName("SHEVA");
   * // true
   *
   * // test for silent sheva
   * text.word[0].hasVowelName("SHUREQ");
   * // false
   * ```
   *
   * @remarks
   * This returns a boolean if the vowel character is present, even for most mater lectionis (e.g. in a holam vav construction, "HOLAM" would return true).
   * The only exception is a shureq, because there is no vowel character for a shureq.
   * According to [Syllabification](/guides/syllabification), a sheva is a vowel and serves as the nucleus of a syllable.
   * It returns `true` for "SHEVA" only when the sheva is the vowel (i.e. a vocal sheva or sheva na').
   */
  hasVowelName(name: SyllableVowelName) {
    return this.syllables.some((syllable) => syllable.hasVowelName(name));
  }

  /**
   * Checks if the text is a form of the Divine Name (i.e the tetragrammaton) with no prefixes
   *
   * @returns a boolean indicating if the text is a form of the Divine Name
   *
   * @example
   * ```ts
   * const text = new Text("יְהוָה");
   * text.words[0].isDivineName;
   * // true
   * ```
   */
  get isDivineName() {
    return this.divineNameForm?.withPrefix === false;
  }

  /**
   * Checks if the Word contains non-Hebrew characters
   *
   * @returns a boolean indicating if the Word contains non-Hebrew characters
   *
   * @example
   * ```ts
   * const text = new Text("Hi!");
   * text.words[0].isNotHebrew;
   * // true
   * ```
   *
   * @remarks
   * If the word contains non-Hebrew characters, it is not considered Hebrew because syllabification is likely not correct.
   */
  get isNotHebrew() {
    return !this.clusters.map((c) => c.isNotHebrew).includes(false);
  }

  /**
   * Checks if the Word is in a construct state
   *
   * @returns a boolean indicating if the Word is in a construct state
   *
   * @example
   * ```ts
   * const text = new Text("בֶּן־אָדָ֕ם");
   * text.words[0].isInConstruct;
   * // true
   * ```
   *
   * @remarks
   * The construct state is indicated by the presence of a maqqef (U+05BE) character
   */
  get isInConstruct() {
    // if word has a maqqef, it is in construct
    return this.text.includes("\u05BE");
  }

  /**
   * Checks if the text is a form of the Divine Name (i.e the tetragrammaton) with at least one prefix
   *
   * @returns a boolean indicating if the text is a prefixed form of the Divine Name
   *
   * @example
   * ```ts
   * const text = new Text("לַֽיהוָ֖ה");
   * text.words[0].isPrefixedDivineName;
   * // true
   * ```
   *
   * @remarks
   * A prefix is one or more of the letters bet, he, waw, kaf, lamed, and mem, each optionally pointed, see {@link divineNameRegExp}
   */
  get isPrefixedDivineName() {
    return this.divineNameForm?.withPrefix === true;
  }

  /**
   * Checks if the syllable is the final syllable in the Word
   *
   * @param syllable
   * @returns a boolean indicating if the syllable is the final syllable in the Word
   */
  isSyllableFinal(syllable: Syllable) {
    const index = this.syllablePosition(syllable);
    return index === this.syllables.length - 1;
  }

  /**
   * Checks if the syllable is the initial syllable in the Word
   *
   * @param syllable
   * @returns a boolean indicating if the syllable is the initial syllable in the Word
   */
  isSyllableInitial(syllable: Syllable) {
    const index = this.syllablePosition(syllable);
    return index === 0;
  }

  /**
   * The original string passed
   *
   * @returns the original string passed
   *
   * @remarks
   * The original string passed to the constructor still undergoes the normalization and sequence process, just not checked against any KetivQeres.
   */
  get original() {
    return this.#original.trim();
  }

  /**
   * Replaces the Divine Name (tetragrammaton) with a substitution, by default either "Adonai" or "Elohim" depending on the niqqud, respecting prefixes
   *
   * @param repl the replacement to use, {@link adonaiOrElohim} by default (see also {@link doubleYod} and {@link hashem})
   * @param form an optional argument for which form of the Divine Name to replace - any form is replaced if not given
   * @returns a new Word with the Divine Name replaced, or this Word if it was left unchanged
   *
   * @remarks
   * The taamim are kept, being placed on the corresponding clusters of the replacement - see {@link DivineNameReplacement}.
   *
   * @example
   * ```ts
   * const text = new Text("וַיֹּ֥אמֶר יְהוָ֖ה אֶל־אַבְרָ֑ם");
   * text.words[1].replaceDivineName().text;
   * // אֲדֹנָ֖י
   * ```
   */
  replaceDivineName(repl: DivineNameReplacement = adonaiOrElohim, form?: DivineNameForm): Word {
    const newText = replaceDivineName(this.#text, repl, form);
    if (newText === this.#text) {
      return this;
    }
    return new Word(newText, this.#sylOpts, this.#original);
  }

  /**
   * Gets all the {@link Syllable | Syllables} in the Word
   *
   * @returns a one dimensional array of Syllables
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * text.words[0].syllables;
   * // [
   * //    Syllable { original: "אֵי" },
   * //    Syllable { original: "פֹה־" }
   * //  ]
   * ```
   */
  get syllables() {
    if (this.#syllablesCache) {
      return this.#syllablesCache;
    }

    if (/\w/.test(this.text) || this.isNotHebrew) {
      const syl = new Syllable(this.clusters);
      syl.parent = this;
      this.#syllablesCache = [syl];
      return [syl];
    }

    const divineNameStart = findDivineNameStart(this.text);
    if (divineNameStart !== null) {
      const syllables = this.#divineNameSyllables(divineNameStart);
      this.#syllablesCache = syllables;
      return syllables;
    }

    const syllables = syllabify(this.clusters, this.#sylOpts, this.isInConstruct);
    syllables.forEach((syl) => (syl.parent = this));

    this.#syllablesCache = syllables;
    return syllables;
  }

  /**
   * Gets the position of a syllable within the Word
   *
   * @param syllable
   * @returns the position of the syllable within the Word (0-based index)
   */
  syllablePosition(syllable: Syllable) {
    const index = this.syllables.findIndex((syl) => syl === syllable);
    if (index === -1) {
      throw new Error("Syllable not found in word");
    }
    return index;
  }

  /**
   * Gets all the taamim characters in the Word
   *
   * @returns a one dimensional array of all the taamim characters in the Word
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.words[0].taamim;
   * // ["\u{596}"];
   * ```
   */
  get taamim() {
    return this.syllables.map((syl) => syl.taamim).flat();
  }

  /**
   * Gets all the taamim names in the Word
   *
   * @returns a one dimensional array of all the taamim names in the Word
   *
   * @example
   * ```ts
   * const text = new Text("הָאָ֖רֶץ");
   * text.words[0].taamimNames;
   * // ["TIPEHA"];
   * ```
   */
  get taamimNames() {
    return this.syllables.map((syl) => syl.taamimNames).flat();
  }

  /**
   * Gets the text of the Word
   *
   * @returns the word's text trimmed of any whitespace characters
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * const words = text.words.map((word) => word.text);
   * words;
   * // [
   * //    "אֵיפֹה־",
   * //    "אַתָּה",
   * //    "מֹשֶׁה"
   * //  ]
   * ```
   */
  get text() {
    return this.#text.trim();
  }

  /**
   * Gets all the vowel names in the Word
   *
   * @returns an array of all the vowel names in the Word
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * text.words[0].vowelNames;
   * // ["HOLAM", "SEGOL"];
   * ```
   */
  get vowelNames() {
    return this.syllables.map((syl) => syl.vowelNames).flat();
  }

  /**
   * Gets all the vowel characters in the Word
   *
   * @returns an array of all the vowel characters in the Word
   *
   * @example
   * ```ts
   * const text = new Text("אֵיפֹה־אַתָּה מֹשֶה");
   * text.words[0].vowels;
   * // ["\u{5B9}", "\u{5B6}"];
   * ```
   */
  get vowels() {
    return this.syllables.map((syl) => syl.vowels).flat();
  }
}
