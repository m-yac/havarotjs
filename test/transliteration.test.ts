import { describe, expect, test } from "vitest";
import { DefaultTransliterationScheme } from "../src/transliteration";

const scheme = new DefaultTransliterationScheme();

/**
 * `[description, original, transliteration]`
 */
const divineName: [string, string, string][] = [
  ["unprefixed", "יְהוָ֥ה", "A\u{B7}do\u{B7}na\u{5A5}i"],
  ["unprefixed, spelled with a holem", "יְהֹוָ֥ה", "A\u{B7}do\u{B7}na\u{5A5}i"],
  ["unprefixed, unpointed", "יהוה", "A\u{B7}do\u{B7}nai"],
  ["read as elohim", "יְהוִ֑ה", "E\u{B7}lo\u{B7}hi\u{591}m"],
  ["read as elohim, following adonai", "אֲדֹנָ֥י יֱהֹוִ֖ה", "a\u{B7}do\u{B7}na\u{5A5}i E\u{B7}lo\u{B7}hi\u{596}m"],
  ["prefixed with bet", "בַּיהוָ֖ה", "bA\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with kaf", "כַּיהוָ֖ה", "kA\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with lamed", "לַֽיהוָ֖ה", "lA\u{5BD}\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with vav", "וַֽיהוָ֣ה אָמָ֑ר", "vA\u{5BD}\u{B7}do\u{B7}na\u{5A3}i a\u{B7}ma\u{591}r"],
  ["prefixed with he", "הַֽיהוָ֖ה", "hA\u{5BD}\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with vav and lamed", "וְלַֽיהוָ֖ה", "v\u{2019}\u{B7}lA\u{5BD}\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with bet, read as elohim", "בַּיהוִ֑ה", "bA\u{B7}lo\u{B7}hi\u{591}m"],
  ["prefixed with mem, where the yod is pointed", "מֵיְהוָ֖ה", "mei\u{B7}A\u{B7}do\u{B7}na\u{596}i"],
  ["prefixed with mem, read as elohim", "מֵיְהוִ֖ה", "mei\u{B7}E\u{B7}lo\u{B7}hi\u{596}m"],
  ["following a maqaf", "אֶל־יְהוָ֖ה", "el\u{5BE} A\u{B7}do\u{B7}na\u{596}i"],
  [
    "within a verse",
    "וַיֹּ֥אמֶר יְהוָ֖ה אֶל־אַבְרָ֑ם",
    "va\u{B7}yo\u{5A5}\u{B7}mer A\u{B7}do\u{B7}na\u{596}i el\u{5BE} av\u{B7}ra\u{591}m"
  ]
];

describe.each(divineName)("Divine name, %s:", (_description, original, transliteration) => {
  test(`${original} is transliterated with the name read out`, () => {
    expect(scheme.trl(original)).toEqual(transliteration);
  });

  test(`${original} leaves no capitalization marker in the output`, () => {
    expect(scheme.trl(original)).not.toContain(scheme.capitalizationMarker);
  });
});

const other: [string, string, string][] = [
  [
    "a verse, capitalized after a sof pasuq",
    "בְּרֵאשִׁ֖ית בָּרָ֣א אֱלֹהִ֑ים׃ וַיֹּ֥אמֶר יְהוָ֖ה",
    "b\u{2019}\u{B7}rei\u{B7}shi\u{596}t ba\u{B7}ra\u{5A3} e\u{B7}lo\u{B7}hi\u{591}m\u{5C3} Va\u{B7}yo\u{5A5}\u{B7}mer A\u{B7}do\u{B7}na\u{596}i"
  ],
  ["a maqaf, which is given a following space", "כָּל־הָאָ֗רֶץ", "kol\u{5BE} ha\u{B7}a\u{597}\u{B7}retz"],
  ["a sheva", "בְּרֵאשִׁ֖ית", "b\u{2019}\u{B7}rei\u{B7}shi\u{596}t"]
];

describe.each(other)("Transliteration of %s:", (_description, original, transliteration) => {
  test(`${original}`, () => {
    expect(scheme.trl(original)).toEqual(transliteration);
  });
});

describe("Mark ordering:", () => {
  // The divine name is matched against text already sequenced by Text, so the order in which
  // the marks of a cluster were encoded should not matter. Here the dagesh of the bet is
  // encoded first before the patach and then after it.
  const orderings = [
    "\u{5D1}\u{5BC}\u{5B7}\u{5D9}\u{5D4}\u{5D5}\u{5B8}\u{596}\u{5D4}",
    "\u{5D1}\u{5B7}\u{5BC}\u{5D9}\u{5D4}\u{5D5}\u{5B8}\u{596}\u{5D4}"
  ];

  test.each(orderings)("%j is transliterated as the divine name", (original) => {
    expect(scheme.trl(original)).toEqual("bA\u{B7}do\u{B7}na\u{596}i");
  });
});
