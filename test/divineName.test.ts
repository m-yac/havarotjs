import { describe, expect, test } from "vitest";
import { Text } from "../src/text";
import { adonaiOrElohim, hashem } from "../src/utils/divineName";

describe.each`
  description                                      | original                             | replaced
  ${"unprefixed"}                                  | ${"יְהוָ֥ה"}                         | ${"אֲדֹנָ֥י"}
  ${"unprefixed, spelled with a holem"}            | ${"יְהֹוָ֥ה"}                        | ${"אֲדֹנָ֥י"}
  ${"unprefixed, unpointed"}                       | ${"יהוה"}                            | ${"אֲדֹנָי"}
  ${"read as elohim"}                              | ${"יְהוִ֑ה"}                         | ${"אֱלֹהִ֑ים"}
  ${"read as elohim, following adonai"}            | ${"אֲדֹנָ֥י יֱהֹוִ֖ה"}               | ${"אֲדֹנָ֥י אֱלֹהִ֖ים"}
  ${"prefixed with bet"}                           | ${"בַּיהוָ֖ה"}                       | ${"בַּאדֹנָ֖י"}
  ${"prefixed with kaf"}                           | ${"כַּיהוָ֖ה"}                       | ${"כַּאדֹנָ֖י"}
  ${"prefixed with lamed"}                         | ${"לַֽיהוָ֖ה"}                       | ${"לַֽאדֹנָ֖י"}
  ${"prefixed with vav"}                           | ${"וַֽיהוָ֣ה אָמָ֑ר"}                | ${"וַֽאדֹנָ֣י אָמָ֑ר"}
  ${"prefixed with he"}                            | ${"הַֽיהוָ֖ה"}                       | ${"הַֽאדֹנָ֖י"}
  ${"prefixed with vav and lamed"}                 | ${"וְלַֽיהוָ֖ה"}                     | ${"וְלַֽאדֹנָ֖י"}
  ${"prefixed with vav and bet"}                   | ${"וּבַֽיהוָ֣ה"}                     | ${"וּבַֽאדֹנָ֣י"}
  ${"prefixed with vav and kaf"}                   | ${"וְכַיהוָ֖ה"}                      | ${"וְכַאדֹנָ֖י"}
  ${"prefixed with vav and mem"}                   | ${"וּמֵיְהוָ֖ה"}                     | ${"וּמֵאֲדֹנָ֖י"}
  ${"prefixed with vav and lamed, unpointed"}      | ${"וליהוה"}                          | ${"ולאדֹנָי"}
  ${"prefixed with vav and lamed, read as elohim"} | ${"וְלַיהוִ֑ה"}                      | ${"וְלַאלֹהִ֑ים"}
  ${"prefixed with bet, read as elohim"}           | ${"בַּיהוִ֑ה"}                       | ${"בַּאלֹהִ֑ים"}
  ${"prefixed with mem, where the yod is pointed"} | ${"מֵיְהוָ֖ה"}                       | ${"מֵאֲדֹנָ֖י"}
  ${"prefixed with mem, read as elohim"}           | ${"מֵיְהוִ֖ה"}                       | ${"מֵאֱלֹהִ֖ים"}
  ${"following a maqaf"}                           | ${"אֶל־יְהוָ֖ה"}                     | ${"אֶל־אֲדֹנָ֖י"}
  ${"within a verse"}                              | ${"וַיֹּ֥אמֶר יְהוָ֖ה אֶל־אַבְרָ֑ם"} | ${"וַיֹּ֥אמֶר אֲדֹנָ֖י אֶל־אַבְרָ֑ם"}
`("Divine Name Replaced:", ({ original, replaced }) => {
  const text = new Text(original, { allowNoNiqqud: true });
  const expected = new Text(replaced, { allowNoNiqqud: true });
  test("Taamim of the original are kept", () => {
    expect(text.replaceDivineName().text).toEqual(expected.text);
  });
});

describe.each`
  description         | original     | replaced
  ${"read as adonai"} | ${"יְהוָ֥ה"} | ${"הַשֵּׁ֥ם"}
  ${"read as elohim"} | ${"יְהוִ֑ה"} | ${"הַשֵּׁ֑ם"}
`("Single Replacement Used for Both Readings:", ({ original, replaced }) => {
  const text = new Text(original, { allowNoNiqqud: true });
  const expected = new Text(replaced, { allowNoNiqqud: true });
  test("Replacement is used", () => {
    expect(text.replaceDivineName(hashem).text).toEqual(expected.text);
  });
});

describe.each`
  description                       | original               | withPrefix | isElohim | replaced
  ${"only the unprefixed name"}     | ${"בַּיהוָ֖ה יְהוָ֖ה"} | ${false}   | ${false} | ${"בַּיהוָ֖ה אֲדֹנָ֖י"}
  ${"only the prefixed name"}       | ${"בַּיהוָ֖ה יְהוָ֖ה"} | ${true}    | ${false} | ${"בַּאדֹנָ֖י יְהוָ֖ה"}
  ${"only the name read as elohim"} | ${"יְהוִ֑ה יְהוָ֖ה"}   | ${false}   | ${true}  | ${"אֱלֹהִ֑ים יְהוָ֖ה"}
`("Restricting Which Forms Are Replaced:", ({ description, original, withPrefix, isElohim, replaced }) => {
  const text = new Text(original, { allowNoNiqqud: true });
  const expected = new Text(replaced, { allowNoNiqqud: true });
  test(`Replaces ${description}`, () => {
    expect(text.replaceDivineName(adonaiOrElohim, { withPrefix, isElohim }).text).toEqual(expected.text);
  });
});

describe.each`
  description                        | original        | form
  ${"unprefixed"}                    | ${"יְהוָ֥ה"}    | ${{ withPrefix: false, isElohim: false }}
  ${"unprefixed, unpointed"}         | ${"יהוה"}       | ${{ withPrefix: false, isElohim: false }}
  ${"unprefixed, read as elohim"}    | ${"יְהוִ֑ה"}    | ${{ withPrefix: false, isElohim: true }}
  ${"prefixed"}                      | ${"לַֽיהוָ֖ה"}  | ${{ withPrefix: true, isElohim: false }}
  ${"prefixed, read as elohim"}      | ${"בַּיהוִ֑ה"}  | ${{ withPrefix: true, isElohim: true }}
  ${"prefixed, followed by a comma"} | ${"בַּיהוָ֔ה,"} | ${{ withPrefix: true, isElohim: false }}
  ${"not the Divine Name"}           | ${"אַבְרָ֑ם"}   | ${null}
`("The Form of the Divine Name a Word Is:", ({ description, original, form }) => {
  const word = new Text(original, { allowNoNiqqud: true }).words[0];
  describe(`Form: ${description}`, () => {
    test("The form is identified", () => {
      expect(word.divineNameForm).toEqual(form);
    });

    test(`hasDivineName is ${form !== null}`, () => {
      expect(word.hasDivineName).toEqual(form !== null);
    });

    test(`isDivineName is ${form !== null && !form.withPrefix}`, () => {
      expect(word.isDivineName).toEqual(form !== null && !form.withPrefix);
    });

    test(`isPrefixedDivineName is ${form !== null && !!form.withPrefix}`, () => {
      expect(word.isPrefixedDivineName).toEqual(form !== null && !!form.withPrefix);
    });
  });
});

describe.each`
  description                | original       | replaced
  ${"unprefixed"}            | ${"יְהוָ֥ה"}   | ${"אֲדֹנָ֥י"}
  ${"prefixed"}              | ${"לַֽיהוָ֖ה"} | ${"לַֽאדֹנָ֖י"}
  ${"unprefixed, as elohim"} | ${"יְהוִ֑ה"}   | ${"אֱלֹהִ֑ים"}
`("A Word Replaces the Divine Name:", ({ description, original, replaced }) => {
  const word = new Text(original, { allowNoNiqqud: true }).words[0];
  const expected = new Text(replaced, { allowNoNiqqud: true }).words[0];
  test(`Replaces the ${description} name`, () => {
    expect(word.replaceDivineName().text).toEqual(expected.text);
  });
});

describe("A Word Left Unchanged:", () => {
  test("A word without the Divine Name is returned as is", () => {
    const word = new Text("אַבְרָ֑ם").words[0];
    expect(word.replaceDivineName()).toBe(word);
  });

  test("A word of a form which is not replaced is returned as is", () => {
    const word = new Text("בַּיהוָ֖ה").words[0];
    expect(word.replaceDivineName(adonaiOrElohim, { withPrefix: false, isElohim: false })).toBe(word);
  });
});

describe.each`
  description                                  | original         | syllables
  ${"unprefixed"}                              | ${"יְהוָ֥ה"}     | ${["יְהוָ֥ה"]}
  ${"unprefixed, read as elohim"}              | ${"יְהוִ֑ה"}     | ${["יְהוִ֑ה"]}
  ${"prefixed, where the yod is unpointed"}    | ${"לַֽיהוָ֖ה"}   | ${["לַֽיהוָ֖ה"]}
  ${"prefixed twice, the yod being unpointed"} | ${"וְלַֽיהוָ֖ה"} | ${["וְ", "לַֽיהוָ֖ה"]}
  ${"prefixed twice, with a shureq"}           | ${"וּבַֽיהוָ֣ה"} | ${["וּ", "בַֽיהוָ֣ה"]}
  ${"prefixed, where the yod is pointed"}      | ${"מֵיְהוָ֖ה"}   | ${["מֵ", "יְהוָ֖ה"]}
  ${"prefixed twice, the yod being pointed"}   | ${"וּמֵיְהוָ֖ה"} | ${["וּ", "מֵ", "יְהוָ֖ה"]}
`("Syllabification of the Divine Name:", ({ description, original, syllables }) => {
  const word = new Text(original, { allowNoNiqqud: true }).words[0];
  test(`Syllabifies the name ${description}`, () => {
    expect(word.syllables.map((syl) => syl.text)).toEqual(syllables);
  });
});

describe.each`
  description                     | original         | replaced                  | prefix
  ${"unprefixed"}                 | ${"יְהוָ֥ה"}     | ${["אֲ", "דֹ", "נָ֥י"]}   | ${null}
  ${"prefixed, read as one word"} | ${"לַֽיהוָ֖ה"}   | ${["לַֽא", "דֹ", "נָ֖י"]} | ${null}
  ${"prefixed with a syllable"}   | ${"מֵיְהוָ֖ה"}   | ${["אֲ", "דֹ", "נָ֖י"]}   | ${"מֵ"}
  ${"prefixed twice"}             | ${"וּמֵיְהוָ֖ה"} | ${["אֲ", "דֹ", "נָ֖י"]}   | ${"מֵ"}
`("A Syllable Replaces the Divine Name:", ({ description, original, replaced, prefix }) => {
  const word = new Text(original, { allowNoNiqqud: true }).words[0];
  const nameSyllable = word.syllables[word.syllables.length - 1];
  const syllables = nameSyllable.replaceDivineName();
  const [first, last] = [syllables[0], syllables[syllables.length - 1]];

  describe(`The name ${description}`, () => {
    test("Is read as the syllables of the replacement", () => {
      expect(syllables.map((syl) => syl.text)).toEqual(replaced);
    });

    test("Is read by syllables which belong to the word it stands in", () => {
      expect(syllables.map((syl) => syl.word)).toEqual(syllables.map(() => word));
    });

    test(`Is read by syllables the first of which ${prefix ? `follows "${prefix}"` : "begins the word"}`, () => {
      expect(first.prev?.text ?? null).toEqual(prefix);
      expect(first.isInitial).toEqual(prefix === null);
    });

    test("Is read by syllables the last of which ends the word", () => {
      expect(last.next).toBeNull();
      expect(last.isFinal).toEqual(true);
    });

    test("Leaves the syllables of the word as they are", () => {
      expect(word.syllables).toContain(nameSyllable);
      expect(word.syllables.some((syl) => syllables.includes(syl))).toEqual(false);
    });
  });
});

describe("A Syllable Left Unchanged:", () => {
  test("A syllable without the Divine Name is returned as is", () => {
    const syllable = new Text("אַבְרָ֑ם").syllables[0];
    expect(syllable.replaceDivineName()).toEqual([syllable]);
  });
});
