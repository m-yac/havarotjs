import { describe, expect, test } from "vitest";
import { Consonant, SyllablePartMap } from "../src/syllablePart";
import { Text } from "../src/text";

describe("syllablePart docstring examples", () => {
  test("kind", () => {
    const text: Text = new Text("בַּ֥ד.");
    expect(text.syllables[0].parts.map((p) => p.kind)).toEqual([
      "consonant",
      "vowel",
      "hebrew mark",
      "consonant",
      "non-hebrew"
    ]);
  });

  test("chars / text / syllable", () => {
    expect(new Text("שׁוּם").syllables[0].parts[1].chars.map((c) => c.text)).toEqual(["ו", "\u{05BC}"]);
    expect(new Text("שֶׁל").syllables[0].parts[0].text).toEqual("שׁ");
    const secondConsonant = new Text("דָּבָר").syllables[1].parts[0];
    expect(secondConsonant.text).toEqual("ב");
    expect(secondConsonant.syllable?.text).toEqual("בָר");
  });

  test("onset / coda / gemination getters", () => {
    const bad: Text = new Text("בַּ֥ד");
    expect((bad.syllables[0].parts[0] as Consonant).partOfOnset).toBe(true);
    expect((bad.syllables[0].parts[3] as Consonant).partOfOnset).toBe(false);
    expect((bad.syllables[0].parts[0] as Consonant).partOfCoda).toBe(false);
    expect((bad.syllables[0].parts[3] as Consonant).partOfCoda).toBe(true);
    const shabbat: Text = new Text("שַׁבָּת");
    expect((shabbat.syllables[0].parts[2] as Consonant).partOfCodaNotFromGemination).toBe(false);
    expect((shabbat.syllables[1].parts[2] as Consonant).partOfCodaNotFromGemination).toBe(true);
    expect((shabbat.syllables[0].parts[2] as Consonant).fromGemination).toBe(true);
    expect((shabbat.syllables[1].parts[2] as Consonant).fromGemination).toBe(false);
  });

  test("SyllablePartMap bad/levad example", () => {
    const taamim = /[\u{0591}-\u{05AF}]/u;
    const map: SyllablePartMap<string> = {
      onConsonant: { ב: "v", בּ: "b", ד: "d", ל: "l" },
      onVowel: { אַ: "a", אְ: "e" },
      onHebrewMark: {
        "": (m) => (taamim.test(m.text) && m.syllable.isAccented ? "́" : "")
      }
    };
    const bad: Text = new Text("בַּ֥ד");
    expect(bad.syllables[0].parts.map((p) => p.apply(map)).join("")).toEqual("bád");
    const levad: Text = new Text("לְ֠בַ֠ד");
    expect(levad.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("")).toEqual("levád");
  });

  test("SyllablePartMap general example", () => {
    const map: SyllablePartMap<string> = {
      onConsonant: { "": "C" },
      onGeminatedConsonant: { "": "G" },
      onVowel: { "": "V" },
      onHebrewMark: { "": "M" },
      onNonHebrew: { "": "N" }
    };
    expect(new Text("שַׁבָּ֥ת.").syllables.map((s) => s.parts.map((p) => p.apply(map)).join(""))).toEqual([
      "CVG",
      "CVMCN"
    ]);
  });

  test("onGeminatedConsonant example", () => {
    const map: SyllablePartMap<string> = {
      onConsonant: { שׁ: "sh", בּ: "b", ת: "t" },
      onVowel: { אַ: "a", אָ: "a" }
    };
    const text: Text = new Text("שַׁבָּת");
    expect(text.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("")).toEqual("shabbat");
    map.onGeminatedConsonant = {
      "": ""
    };
    expect(text.syllables.map((s) => s.parts.map((p) => p.apply(map)).join("")).join("")).toEqual("shabat");
  });
});
