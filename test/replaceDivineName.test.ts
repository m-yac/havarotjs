import { describe, expect, test } from "vitest";
import { Text } from "../src/text";
import { adonaiOrElohim, hashem } from "../src/utils/replaceDivineName";

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
