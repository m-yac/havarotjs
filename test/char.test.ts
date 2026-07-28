import { describe, expect, test } from "vitest";
import { Char } from "../src/char";
import { Cluster } from "../src/cluster";
import { Text } from "../src/text";
import { hebChars } from "../src/utils/regularExpressions";

describe("Char", () => {
  describe("constructor", () => {
    test("should create a Char instance with the correct text and sequencePosition", () => {
      const char = new Char("א");
      expect(char.text).toBe("א");
      expect(char.sequencePosition).toBe(0);

      const niqqud = new Char("ֶ");
      expect(niqqud.text).toBe("ֶ");
      expect(niqqud.sequencePosition).toBe(3);

      const nonHebrew = new Char("a");
      expect(nonHebrew.text).toBe("a");
      expect(nonHebrew.sequencePosition).toBe(10);
    });
  });

  describe("isCharacterName", () => {
    test("should return true if the Char instance matches the given character name", () => {
      const aleph = new Char("א");
      expect(aleph.isCharacterName("ALEF")).toBe(true);
      expect(aleph.isCharacterName("BET")).toBe(false);

      const patach = new Char("ַ");
      expect(patach.isCharacterName("PATAH")).toBe(true);
      expect(patach.isCharacterName("SHEVA")).toBe(false);

      const sheva = new Char("ְ");
      expect(sheva.isCharacterName("SHEVA")).toBe(true);
      expect(sheva.isCharacterName("REVIA")).toBe(false);

      const rebia = new Char("֗");
      expect(rebia.isCharacterName("REVIA")).toBe(true);
      expect(rebia.isCharacterName("MAQAF")).toBe(false);

      const maqqaf = new Char("־");
      expect(maqqaf.isCharacterName("MAQAF")).toBe(true);
      expect(maqqaf.isCharacterName("SOF_PASUQ")).toBe(false);

      const sofPasuq = new Char("׃");
      expect(sofPasuq.isCharacterName("SOF_PASUQ")).toBe(true);
      expect(sofPasuq.isCharacterName("ALEF")).toBe(false);
    });

    test("should throw an error if the given character name is invalid", () => {
      const char = new Char("א");
      // @ts-expect-error: need to pass an invalid name
      expect(() => char.isCharacterName("INVALID_NAME")).toThrow("INVALID_NAME is not a valid value");
    });
  });

  describe("characterName", () => {
    test("should return the correct character name for Hebrew characters", () => {
      const aleph = new Char("א");
      expect(aleph.name).toBe("ALEF");

      const bet = new Char("ב");
      expect(bet.name).toBe("BET");

      const patach = new Char("ַ");
      expect(patach.name).toBe("PATAH");

      const sheva = new Char("ְ");
      expect(sheva.name).toBe("SHEVA");

      const rebia = new Char("֗");
      expect(rebia.name).toBe("REVIA");

      const maqqaf = new Char("־");
      expect(maqqaf.name).toBe("MAQAF");

      const sofPasuq = new Char("׃");
      expect(sofPasuq.name).toBe("SOF_PASUQ");
    });

    test("should return null for non-Hebrew characters", () => {
      const nonHebrew = new Char("a");
      expect(nonHebrew.name).toBeNull();
    });
  });

  describe("cluster", () => {
    test("should allow setting and getting the cluster property", () => {
      const char = new Char("א");
      const cluster = new Cluster("אָ");

      expect(char.cluster).toBeNull();

      char.parent = cluster;
      expect(char.cluster).toBe(cluster);
    });
  });

  describe("is* properties", () => {
    test("should correctly identify character types", () => {
      const consonant = new Char("א");
      expect(consonant.isConsonant).toBe(true);
      expect(consonant.isLigature).toBe(false);
      expect(consonant.isDagesh).toBe(false);
      expect(consonant.isRafe).toBe(false);
      expect(consonant.isSheva).toBe(false);
      expect(consonant.isVowel).toBe(false);
      expect(consonant.isTaamim).toBe(false);
      expect(consonant.isNotHebrew).toBe(false);

      const dagesh = new Char("ּ");
      expect(dagesh.isConsonant).toBe(false);
      expect(dagesh.isLigature).toBe(false);
      expect(dagesh.isDagesh).toBe(true);
      expect(dagesh.isRafe).toBe(false);
      expect(consonant.isSheva).toBe(false);
      expect(dagesh.isVowel).toBe(false);
      expect(dagesh.isTaamim).toBe(false);
      expect(dagesh.isNotHebrew).toBe(false);

      const rafe = new Char("ֿ");
      expect(rafe.isConsonant).toBe(false);
      expect(rafe.isLigature).toBe(false);
      expect(rafe.isDagesh).toBe(false);
      expect(rafe.isRafe).toBe(true);
      expect(consonant.isSheva).toBe(false);
      expect(rafe.isVowel).toBe(false);
      expect(rafe.isTaamim).toBe(false);
      expect(rafe.isNotHebrew).toBe(false);

      const sheva = new Char("ְ");
      expect(sheva.isConsonant).toBe(false);
      expect(sheva.isLigature).toBe(false);
      expect(sheva.isDagesh).toBe(false);
      expect(sheva.isRafe).toBe(false);
      expect(sheva.isSheva).toBe(true);
      expect(sheva.isVowel).toBe(false);
      expect(sheva.isTaamim).toBe(false);
      expect(sheva.isNotHebrew).toBe(false);

      const vowel = new Char("ָ");
      expect(vowel.isConsonant).toBe(false);
      expect(vowel.isLigature).toBe(false);
      expect(vowel.isDagesh).toBe(false);
      expect(vowel.isRafe).toBe(false);
      expect(consonant.isSheva).toBe(false);
      expect(vowel.isVowel).toBe(true);
      expect(vowel.isTaamim).toBe(false);
      expect(vowel.isNotHebrew).toBe(false);

      const taamim = new Char("֑");
      expect(taamim.isConsonant).toBe(false);
      expect(taamim.isLigature).toBe(false);
      expect(taamim.isDagesh).toBe(false);
      expect(taamim.isRafe).toBe(false);
      expect(consonant.isSheva).toBe(false);
      expect(taamim.isVowel).toBe(false);
      expect(taamim.isTaamim).toBe(true);
      expect(taamim.isNotHebrew).toBe(false);

      const nonHebrew = new Char("a");
      expect(nonHebrew.isConsonant).toBe(false);
      expect(nonHebrew.isLigature).toBe(false);
      expect(nonHebrew.isDagesh).toBe(false);
      expect(nonHebrew.isRafe).toBe(false);
      expect(consonant.isSheva).toBe(false);
      expect(nonHebrew.isVowel).toBe(false);
      expect(nonHebrew.isTaamim).toBe(false);
      expect(nonHebrew.isNotHebrew).toBe(true);
    });
  });

  describe("text", () => {
    test("should return the correct text", () => {
      const char = new Char("א");
      expect(char.text).toBe("א");
    });
  });

  describe("with Hebrew words", () => {
    test("should handle words from the Hebrew Bible correctly", () => {
      const word1 = "וְהָאָ֗רֶץ";
      const chars1 = new Text(word1).chars;
      expect(chars1.map((char) => char.sequencePosition)).toEqual([0, 3, 0, 3, 0, 3, 4, 0, 3, 0]);

      const word2 = "קָ֣רָא";
      const chars2 = new Text(word2).chars;
      expect(chars2.map((char) => char.sequencePosition)).toEqual([0, 3, 4, 0, 3, 0]);
    });
  });
});

/**
 * `Char.isNotHebrew` is defined as `sequencePosition === 10`, i.e. "findPos had no category
 * for this character". `Cluster.isNotHebrew` is defined as `!hebChars.test(text)`, i.e.
 * "this is outside the Hebrew Unicode blocks". Those are not the same question, and since
 * `taamim` was narrowed to [\u{0591}-\u{05AE}] in 4056066, findPos has no category for nine
 * assigned Hebrew characters - so the two properties disagree about them.
 *
 * These tests pin the CURRENT behavior, not the desired behavior. If either definition is
 * changed, they should fail and be updated deliberately.
 */
describe("isNotHebrew: Char and Cluster disagree (known discrepancy)", () => {
  const uncategorized: [string, string][] = [
    ["\u{05AF}", "masora circle"],
    ["\u{05BE}", "maqaf"],
    ["\u{05C0}", "paseq"],
    ["\u{05C3}", "sof pasuq"],
    ["\u{05C4}", "upper dot"],
    ["\u{05C5}", "lower dot"],
    ["\u{05C6}", "nun hafukha"],
    ["\u{05F3}", "geresh"],
    ["\u{05F4}", "gershayim"]
  ];

  test.each(uncategorized)("%s (%s) is in the Hebrew block but Char reports isNotHebrew", (char) => {
    expect(hebChars.test(char)).toBe(true);
    expect(new Char(char).sequencePosition).toBe(10);
    // the discrepancy itself:
    expect(new Char(char).isNotHebrew).toBe(true);
  });

  test("a sof pasuq disagrees between its Char and its Cluster", () => {
    const cluster = new Text("\u{05DE}\u{05B7}\u{05D3}\u{05BC}\u{05D5}\u{05BC}\u{05E2}\u{05B7}\u{05C3}").clusters.at(
      -1
    )!;
    expect(cluster.text).toContain("\u{05C3}");
    expect(cluster.isNotHebrew).toBe(false);
    expect(cluster.chars.some((c) => c.text === "\u{05C3}" && c.isNotHebrew)).toBe(true);
  });

  const categorized: [string, string][] = [
    ["\u{05D0}", "consonant"],
    ["\u{05C1}", "shin dot"],
    ["\u{05BC}", "dagesh"],
    ["\u{05BF}", "rafe"],
    ["\u{05B0}", "sheva"],
    ["\u{05B8}", "qamats"],
    ["\u{05A5}", "meayla"],
    ["\u{05BD}", "meteg"]
  ];

  test.each(categorized)("%s (%s) is categorized by findPos, so the two agree", (char) => {
    expect(hebChars.test(char)).toBe(true);
    expect(new Char(char).isNotHebrew).toBe(false);
  });

  test.each([["a"], ["1"], [" "], ["("]])("%s is genuinely not Hebrew, so the two agree", (char) => {
    expect(hebChars.test(char)).toBe(false);
    expect(new Char(char).isNotHebrew).toBe(true);
  });
});
