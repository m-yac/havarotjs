import { describe, expect, test } from "vitest";
import { Cluster } from "../src/cluster";
import { Text } from "../src/index";
import { Syllable } from "../src/syllable";

describe.each`
  description                                          | hebrew         | syllableNum | coda    | codaNoGemination
  ${"open syllable followed by gemination"}            | ${"מַדּוּעַ"}  | ${0}        | ${"דּ"} | ${""}
  ${"open syllable followed by no gemination"}         | ${"מֶלֶךְ"}    | ${0}        | ${""}   | ${""}
  ${"closed syllable followed by dagesh qal"}          | ${"מַסְגֵּר"}  | ${0}        | ${"ס"}  | ${"ס"}
  ${"open syllable with sheva followed by dagesh qal"} | ${"שְׁתַּיִם"} | ${0}        | ${""}   | ${""}
`("coda:", ({ description, hebrew, syllableNum, coda, codaNoGemination }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  describe(description, () => {
    test(`coda to equal ${coda}`, () => {
      expect(syllable.coda.map((p) => p.text).join("")).toEqual(coda);
    });
    test(`codaNoGemination to equal ${codaNoGemination}`, () => {
      expect(syllable.codaNoGemination.map((p) => p.text).join("")).toEqual(codaNoGemination);
    });
  });
});

describe.each`
  description              | hebrew             | syllableNum | consonants
  ${"one consonant"}       | ${"מַדּ֥וּעַ"}     | ${0}        | ${["מ"]}
  ${"two consonants"}      | ${"לֹ֥א"}          | ${0}        | ${["ל", "א"]}
  ${"three consonants"}    | ${"רְ֭שָׁעִים"}    | ${2}        | ${["ע", "י", "ם"]}
  ${"consonant character"} | ${"וּ֝לְאֻמִּ֗ים"} | ${0}        | ${["ו"]}
`("consonants:", ({ description, hebrew, syllableNum, consonants }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const syllableconsonants = syllable.consonants;
  describe(description, () => {
    test(`consonants to equal ${consonants}`, () => {
      expect(syllableconsonants).toEqual(consonants);
    });
  });
});

describe.each`
  description              | hebrew             | syllableNum | consonantNames
  ${"one consonant"}       | ${"מַדּ֥וּעַ"}     | ${0}        | ${["MEM"]}
  ${"two consonants"}      | ${"לֹ֥א"}          | ${0}        | ${["LAMED", "ALEF"]}
  ${"three consonants"}    | ${"רְ֭שָׁעִים"}    | ${2}        | ${["AYIN", "YOD", "FINAL_MEM"]}
  ${"consonant character"} | ${"וּ֝לְאֻמִּ֗ים"} | ${0}        | ${["VAV"]}
`("consonantNames:", ({ description, hebrew, syllableNum, consonantNames }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const syllableconsonantNames = syllable.consonantNames;
  describe(description, () => {
    test(`syllableconsonantNames to equal ${consonantNames}`, () => {
      expect(syllableconsonantNames).toEqual(consonantNames);
    });
  });
});

describe.each`
  description        | hebrew        | syllableNum | consonantName | hasConsonant
  ${"has consonant"} | ${"מַדּוּעַ"} | ${0}        | ${"MEM"}      | ${true}
  ${"not consonant"} | ${"לֹ֥א"}     | ${0}        | ${"MEM"}      | ${false}
`("hasConsonantName:", ({ description, hebrew, syllableNum, consonantName, hasConsonant }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const syllablehasConsonant = syllable.hasConsonantName(consonantName);
  describe(description, () => {
    test(`syllablehasConsonant to equal ${hasConsonant}`, () => {
      expect(syllablehasConsonant).toEqual(hasConsonant);
    });
  });
});

describe("hasConsonantName (error)", () => {
  test("throws error", () => {
    const text = new Text("הָאָ֖רֶץ");
    // @ts-expect-error: testing an invalid parameter
    expect(() => text.syllables[0].hasConsonantName("BOB")).toThrow();
  });
});

describe.each`
  description                  | hebrew              | syllableNum | taamName    | result
  ${"has character"}           | ${"הָאָ֖רֶץ"}       | ${1}        | ${"TIPEHA"} | ${true}
  ${"no character"}            | ${"וַֽיְהִי־כֵֽן׃"} | ${1}        | ${"TIPEHA"} | ${false}
  ${"has wrong character"}     | ${"הָאָ֖רֶץ"}       | ${1}        | ${"ZINOR"}  | ${false}
  ${"has multiple characters"} | ${"מִתָּ֑͏ַ֜חַת"}    | ${1}        | ${"GERESH"} | ${true}
`("hasTaamName:", ({ description, hebrew, syllableNum, taamName, result }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const hasTaamName = syllable.hasTaamName(taamName);
  describe(description, () => {
    test(`Should cluster have ${taamName}? ${result}`, () => {
      expect(hasTaamName).toEqual(result);
    });
  });
});

describe("hasTaamName (error)", () => {
  test("throws error", () => {
    const text = new Text("הָאָ֖רֶץ");
    // @ts-expect-error: testing an invalid parameter
    expect(() => text.syllables[0].hasTaamName("BOB")).toThrow();
  });
});

describe.each`
  description                                    | hebrew              | syllableNum | vowelName   | result
  ${"syllable with patah"}                       | ${"הַֽ֭יְחָבְרְךָ"} | ${0}        | ${"PATAH"}  | ${true}
  ${"syllable with sheva"}                       | ${"הַֽ֭יְחָבְרְךָ"} | ${1}        | ${"SHEVA"}  | ${true}
  ${"syllable with silent sheva"}                | ${"הַֽ֭יְחָבְרְךָ"} | ${2}        | ${"SHEVA"}  | ${false}
  ${"syllable with qamats"}                      | ${"הַֽ֭יְחָבְרְךָ"} | ${2}        | ${"QAMATS"} | ${true}
  ${"syllable with shureq"}                      | ${"תִגְּע֖וּ"}      | ${2}        | ${"SHUREQ"} | ${true}
  ${"syllable with vav and dagesh (not shureq)"} | ${"הַוּֽוֹת׃"}      | ${1}        | ${"SHUREQ"} | ${false}
  ${"syllable with tsere-yod"}                   | ${"קָדְשֵׁ֧י"}      | ${1}        | ${"TSERE"}  | ${true}
  ${"syllable with holam-vav"}                   | ${"בַּיּ֣וֹם"}      | ${1}        | ${"HOLAM"}  | ${true}
  ${"syllable with hiriq-yod"}                   | ${"אָנֹֽכִי"}       | ${2}        | ${"HIRIQ"}  | ${true}
  ${"syllable with mixed chars"}                 | ${"rˁִː֣"}          | ${0}        | ${"HIRIQ"}  | ${true}
`("hasVowelName:", ({ description, hebrew, syllableNum, vowelName, result }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const syllableVowelName = syllable.hasVowelName(vowelName);
  describe(description, () => {
    test(`vowelName to equal ${vowelName}`, () => {
      expect(syllableVowelName).toEqual(result);
    });
  });
});

describe.each`
  description          | hebrew              | syllableNum | vowelName
  ${"Incorrect value"} | ${"הַֽ֭יְחָבְרְךָ"} | ${0}        | ${"TEST"}
`("hasVowelName, error:", ({ hebrew, syllableNum, vowelName }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  test(`vowelName${vowelName} should throw error`, () => {
    expect(() => syllable.hasVowelName(vowelName)).toThrow();
  });
});

describe.each`
  description               | hebrew                 | syllableNum | nextExists | nextText
  ${"has next"}             | ${"הַֽ֭יְחָבְרְךָ"}    | ${0}        | ${true}    | ${"יְ"}
  ${"does not have next"}   | ${"כִּסֵּ֣א"}          | ${1}        | ${false}   | ${null}
  ${"does not cross words"} | ${"כִּסֵּ֣א הַוּ֑וֹת"} | ${1}        | ${false}   | ${null}
`("implements Node:", ({ description, hebrew, syllableNum, nextExists, nextText }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const nextSyllable = syllable.next;
  describe(description, () => {
    test(`${description}`, () => {
      expect(nextSyllable).toBeDefined();
      if (nextExists && nextSyllable && nextSyllable instanceof Syllable) {
        expect(nextSyllable.text).toEqual(nextText);
      }
    });
  });
});

describe.each`
  description             | hebrew           | syllableNum | expected
  ${"final syllable"}     | ${"וַיִּקְרָ֨א"} | ${2}        | ${true}
  ${"non-final syllable"} | ${"וַיִּקְרָ֨א"} | ${0}        | ${false}
`("isFinal:", ({ description, hebrew, syllableNum, expected }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  describe(description, () => {
    test(`isFinal to equal ${expected}`, () => {
      expect(syllable.isFinal).toEqual(expected);
    });
  });
});

describe("isFinal (orphan syllable)", () => {
  test("returns false when syllable has no word", () => {
    const clusters = [new Cluster("דָּ")];
    const syllable = new Syllable(clusters);
    expect(syllable.isFinal).toEqual(false);
  });
});

describe.each`
  description               | hebrew           | syllableNum | expected
  ${"initial syllable"}     | ${"וַיִּקְרָ֨א"} | ${0}        | ${true}
  ${"non-initial syllable"} | ${"וַיִּקְרָ֨א"} | ${2}        | ${false}
`("isInitial:", ({ description, hebrew, syllableNum, expected }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  describe(description, () => {
    test(`isInitial to equal ${expected}`, () => {
      expect(syllable.isInitial).toEqual(expected);
    });
  });
});

describe("isInitial (orphan syllable)", () => {
  test("returns false when syllable has no word", () => {
    const clusters = [new Cluster("דָּ")];
    const syllable = new Syllable(clusters);
    expect(syllable.isInitial).toEqual(false);
  });
});

describe.each`
  description                   | hebrew           | syllableNum | expected
  ${"first syllable position"}  | ${"וַיִּקְרָ֨א"} | ${0}        | ${0}
  ${"last syllable position"}   | ${"וַיִּקְרָ֨א"} | ${2}        | ${2}
  ${"middle syllable position"} | ${"מַדּוּעַ"}    | ${1}        | ${1}
`("position:", ({ description, hebrew, syllableNum, expected }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  describe(description, () => {
    test(`position to equal ${expected}`, () => {
      expect(syllable.position).toEqual(expected);
    });
  });
});

describe("position (orphan syllable)", () => {
  test("returns -1 when syllable has no word", () => {
    const clusters = [new Cluster("דָּ")];
    const syllable = new Syllable(clusters);
    expect(syllable.position).toEqual(-1);
  });
});

describe.each`
  description                                    | hebrew             | syllableNum | onset   | nucleus       | codaNoGemination
  ${"closed syllable"}                           | ${"יָ֥ם"}          | ${0}        | ${"י"}  | ${"\u{05B8}"} | ${"ם"}
  ${"open syllable"}                             | ${"מַדּוּעַ"}      | ${0}        | ${"מ"}  | ${"\u{05B7}"} | ${""}
  ${"syllable with shureq"}                      | ${"מַדּוּעַ"}      | ${1}        | ${"דּ"} | ${"וּ"}       | ${""}
  ${"syllable with shureq and meteg"}            | ${"רֽוּחַ"}        | ${0}        | ${"ר"}  | ${"וּ"}       | ${""}
  ${"syllable with furtive patah"}               | ${"מַדּוּעַ"}      | ${2}        | ${""}   | ${"\u{05B7}"} | ${"ע"}
  ${"syllable with furtive patah and sof pasuq"} | ${"מַדּוּעַ׃"}     | ${2}        | ${""}   | ${"\u{05B7}"} | ${"ע"}
  ${"word-initial shureq"}                       | ${"וּמֶלֶךְ"}      | ${0}        | ${""}   | ${"וּ"}       | ${""}
  ${"onset cluster (not supported)"}             | ${"שְׁתַּיִם"}     | ${0}        | ${"שׁ"} | ${"\u{05B0}"} | ${""}
  ${"Jerusalem w/ patah penultimate syllable"}   | ${"יְרוּשָׁלִַ֗ם"} | ${3}        | ${"ל"}  | ${"\u{05B7}"} | ${""}
  ${"Jerusalem w/ patah final syllable"}         | ${"יְרוּשָׁלִַ֗ם"} | ${4}        | ${""}   | ${"\u{05B4}"} | ${"ם"}
`("structure:", ({ description, hebrew, syllableNum, onset, nucleus, codaNoGemination }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const [syllableOnset, syllableNucleus] = syllable.structure;
  describe(description, () => {
    test(`onset to equal ${onset}`, () => {
      expect(syllableOnset.map((p) => p.text).join("")).toEqual(onset);
    });
    test(`nucleus to equal ${nucleus}`, () => {
      expect(syllableNucleus.map((p) => p.text).join("")).toEqual(nucleus);
    });
    test(`codaNoGemination to equal ${codaNoGemination}`, () => {
      expect(syllable.codaNoGemination.map((p) => p.text).join("")).toEqual(codaNoGemination);
    });
  });
});

describe("parts/structure cache", () => {
  const str = "סַפִּ֖יר";
  const heb = new Text(str);
  const syllable = heb.syllables[0];
  const parts = syllable.parts;
  const structure = syllable.structure;

  test("parts is cached", () => {
    expect(syllable.parts).toBe(parts);
  });

  test("structure is cached", () => {
    expect(syllable.structure).toBe(structure);
  });

  // caches live on the syllable, so a new (but otherwise identical) syllable object
  // does not share them
  test("caches are per-syllable", () => {
    const newSyllable = new Text(str).syllables[0];
    expect(newSyllable.parts).not.toBe(parts);
    expect(newSyllable.structure).not.toBe(structure);
  });

  // the SyllablePart objects reached via structure should be the very same objects
  // reached via parts (assuming only Consonants and Vowels)
  test("structure and parts caches match", () => {
    const partsFromStructure = structure.flat(1);
    expect(partsFromStructure.length).toEqual(parts.length);
    for (let i = 0; i < partsFromStructure.length; i++) {
      expect(partsFromStructure[i]).toBe(parts[i]);
    }
  });

  test("coda includes gemination but codaNoGemination does not", () => {
    expect(syllable.coda.map((p) => p.text).join("")).toEqual("\u{05E4}\u{05BC}");
    expect(syllable.codaNoGemination).toEqual([]);
  });

  test("codaNoGemination is cached separately", () => {
    expect(syllable.codaNoGemination).toBe(syllable.codaNoGemination);
  });
});

describe("parts/structure cache (orphan syllable)", () => {
  // `isFinal` (furtive patah) and `next` (gemination) both read tree wiring that is only
  // set once the syllable is attached to a Word, so an unattached syllable must not cache
  // - otherwise an incorrect result would be frozen permanently with no way to invalidate
  test("an orphan syllable does not cache its parts", () => {
    const clusters = [new Cluster("דָּ")];
    const syllable = new Syllable(clusters);
    expect(syllable.parts).not.toBe(syllable.parts);
  });

  test("an attached syllable does cache its parts", () => {
    const syllable = new Text("\u{05D3}\u{05B8}\u{05D1}\u{05B8}\u{05E8}").syllables[0];
    expect(syllable.parts).toBe(syllable.parts);
  });
});

describe.each`
  description              | hebrew              | sylNum | taamim
  ${"one character"}       | ${"הָאָ֖רֶץ"}       | ${1}   | ${["\u{596}"]}
  ${"no characters"}       | ${"וַֽיְהִי־כֵֽן׃"} | ${1}   | ${[]}
  ${"multiple characters"} | ${"מִתָּ֑͏ַ֜חַת"}    | ${1}   | ${["\u{591}", "\u{59C}"]}
`("taamim:", ({ description, hebrew, sylNum, taamim }) => {
  describe(description, () => {
    test(`taamim to equal ${taamim}`, () => {
      const text = new Text(hebrew);
      expect(text.syllables[sylNum].taamim).toEqual(taamim);
    });
  });
});

describe.each`
  description              | hebrew              | sylNum | taamimNames
  ${"one character"}       | ${"הָאָ֖רֶץ"}       | ${1}   | ${["TIPEHA"]}
  ${"no characters"}       | ${"וַֽיְהִי־כֵֽן׃"} | ${1}   | ${[]}
  ${"multiple characters"} | ${"מִתָּ֑͏ַ֜חַת"}    | ${1}   | ${["ETNAHTA", "GERESH"]}
`("taamimNames:", ({ description, hebrew, sylNum, taamimNames }) => {
  describe(description, () => {
    test(`taamimNames to equal ${taamimNames}`, () => {
      const text = new Text(hebrew);
      expect(text.syllables[sylNum].taamimNames).toEqual(taamimNames);
    });
  });
});

describe.each`
  description             | hebrew              | syllableNum | vowelNames
  ${"with one character"} | ${"הָאָ֖רֶץ"}       | ${1}        | ${["QAMATS"]}
  ${"with sheva"}         | ${"וַֽיְהִי־כֵֽן׃"} | ${1}        | ${["SHEVA"]}
  ${"with shureq"}        | ${"מַדּ֥וּעַ"}      | ${1}        | ${["SHUREQ"]}
  ${"multiple vowels"}    | ${"מִתָּ֑͏ַ֜חַת"}    | ${1}        | ${["QAMATS", "PATAH"]}
`("vowelNames:", ({ description, hebrew, syllableNum, vowelNames }) => {
  describe(description, () => {
    test(`vowelNames to equal ${vowelNames}`, () => {
      const text = new Text(hebrew);
      expect(text.syllables[syllableNum].vowelNames).toEqual(vowelNames);
    });
  });
});

describe.each`
  description             | hebrew              | syllableNum | vowels
  ${"with one character"} | ${"הָאָ֖רֶץ"}       | ${1}        | ${["\u{05B8}"]}
  ${"with sheva"}         | ${"וַֽיְהִי־כֵֽן׃"} | ${1}        | ${["\u{05B0}"]}
  ${"with shureq"}        | ${"מַדּ֥וּעַ"}      | ${1}        | ${["\u{05D5}\u{05BC}"]}
  ${"multiple vowels"}    | ${"מִתָּ֑͏ַ֜חַת"}    | ${1}        | ${["\u{05B8}", "\u{05B7}"]}
`("vowels:", ({ description, hebrew, syllableNum, vowels }) => {
  describe(description, () => {
    test(`vowelNames to equal ${vowels}`, () => {
      const text = new Text(hebrew);
      expect(text.syllables[syllableNum].vowels).toEqual(vowels);
    });
  });
});

describe("word:", () => {
  test("if no word, null", () => {
    const clusters = [new Cluster("דָּ")];
    const syllable = new Syllable(clusters);
    expect(syllable.word).toEqual(null);
  });

  test("syllable text same as word text", () => {
    const text = new Text("זֶה");
    const first = text.syllables[0];
    expect(first?.word?.text).toEqual(first.text);
  });

  test("syllable text not the same as word text", () => {
    const text = new Text("דָּבָר");
    const last = text.syllables[text.syllables.length - 1];
    expect(last?.word?.text).not.toEqual("דָּ");
  });
});
