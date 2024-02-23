import { Cluster } from "../src/cluster";
import { Text } from "../src/index";
import { Syllable } from "../src/syllable";
import { Consonant, ConsonantType, Vowel } from "../src/syllablePart";

describe.each`
  description                                          | hebrew         | syllableNum | coda
  ${"open syllable followed by gemination"}            | ${"מַדּוּעַ"}  | ${0}        | ${"דּ"}
  ${"open syllable followed by no gemination"}         | ${"מֶלֶךְ"}    | ${0}        | ${""}
  ${"closed syllable followed by dagesh qal"}          | ${"מַסְגֵּר"}  | ${0}        | ${"ס"}
  ${"open syllable with sheva followed by dagesh qal"} | ${"שְׁתַּיִם"} | ${0}        | ${""}
`("coda:", ({ description, hebrew, syllableNum, coda }) => {
  const heb = new Text(hebrew);
  const syllable = heb.syllables[syllableNum];
  const syllablecoda = syllable.coda;
  describe(description, () => {
    test(`coda to equal ${coda}`, () => {
      expect(syllablecoda.map((p) => p.text).join("")).toEqual(coda);
    });
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
    expect(() => syllable.hasVowelName(vowelName)).toThrowError();
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
  const [syllableOnset, syllableNucleus, syllableCoda] = syllable.structure;
  const syllableCodaNoGemination = syllableCoda.filter((p) => !p.fromGemination);
  describe(description, () => {
    test(`onset to equal ${onset}`, () => {
      expect(syllableOnset.map((p) => p.text).join("")).toEqual(onset);
    });
    test(`nucleus to equal ${nucleus}`, () => {
      expect(syllableNucleus.map((p) => p.text).join("")).toEqual(nucleus);
    });
    test(`codaNoGemination to equal ${codaNoGemination}`, () => {
      expect(syllableCodaNoGemination.map((p) => p.text).join("")).toEqual(codaNoGemination);
    });
  });
});

describe("parts/structure cache", () => {
  const str = "סַפִּ֖יר";
  const heb = new Text(str);
  const syllable = heb.syllables[0];
  const parts = syllable.parts;
  const structure = syllable.structure;

  const expected_parts = [
    new Consonant(heb.chars.slice(0, 1), ConsonantType.onsetConsonant),
    new Vowel(heb.chars.slice(1, 2)),
    new Consonant(heb.chars.slice(2, 4), ConsonantType.codaGeminatedConsonant)
  ];
  const expected_structure = [[expected_parts[0]], [expected_parts[1]], [expected_parts[2]]];

  test("parts has expected value", () => {
    expect(parts).toEqual(expected_parts);
    // NB: They are equal, but are not the same reference
    expect(parts).not.toBe(expected_parts);
  });

  test("structure has expected value", () => {
    expect(structure).toEqual(expected_structure);
    // NB: They are equal, but are not the same reference
    expect(structure).not.toBe(expected_structure);
  });

  // If syllable.parts was cached, then any future call to
  // syllable.parts should return the same reference as the first
  test("parts is cached", () => {
    const second_get_of_parts = syllable.parts;
    expect(second_get_of_parts).toBe(parts);
  });

  // If syllable.structure was cached, then any future call to
  // syllable.structure should return the same reference as the first
  test("structure is cached", () => {
    const second_get_of_structure = syllable.structure;
    expect(second_get_of_structure).toBe(structure);
  });

  // Additionally, the references to the indiviual SyllablePart objects
  // returned by syllable.parts and syllable.structure should be the
  // same (assuming no taamim)
  test("structure and parts caches match", () => {
    const parts_from_structure = structure.flat(1);
    expect(parts_from_structure.length).toEqual(parts.length);
    for (let i = 0; i < parts_from_structure.length; i++) {
      expect(parts_from_structure[i]).toBe(parts[i]);
    }
  });
});

describe.each`
  description                     | hebrew              | syllableNum | vowel                 | allowNoNiqqud
  ${"syllable with patah"}        | ${"הַֽ֭יְחָבְרְךָ"} | ${0}        | ${"\u{05B7}"}         | ${false}
  ${"syllable with sheva"}        | ${"הַֽ֭יְחָבְרְךָ"} | ${1}        | ${"\u{05B0}"}         | ${false}
  ${"syllable with silent sheva"} | ${"הַֽ֭יְחָבְרְךָ"} | ${2}        | ${"\u{05B8}"}         | ${false}
  ${"syllable with none"}         | ${"test"}           | ${0}        | ${null}               | ${true}
  ${"syllable with shureq"}       | ${"תִגְּע֖וּ"}      | ${2}        | ${"\u{05D5}\u{05BC}"} | ${false}
  ${"syllable with tsere-yod"}    | ${"קָדְשֵׁ֧י"}      | ${1}        | ${"\u{05B5}"}         | ${false}
  ${"syllable with holam-vav"}    | ${"בַּיּ֣וֹם"}      | ${1}        | ${"\u{05B9}"}         | ${false}
  ${"syllable with hiriq-yod"}    | ${"אָנֹֽכִי"}       | ${2}        | ${"\u{05B4}"}         | ${false}
  ${"syllable with mixed chars"}  | ${"rˁִː֣"}          | ${0}        | ${"\u{05B4}"}         | ${false}
`("vowel:", ({ description, hebrew, syllableNum, vowel, allowNoNiqqud }) => {
  // normally don't use `allowNoNiqqud` in testing, but needed to get `null`
  const heb = new Text(hebrew, { allowNoNiqqud });
  const syllable = heb.syllables[syllableNum];
  const syllableVowel = syllable.vowel;
  describe(description, () => {
    test(`vowel to equal ${vowel}`, () => {
      expect(syllableVowel).toEqual(vowel);
    });
  });
});

describe.each`
  description                     | hebrew              | syllableNum | vowelName   | allowNoNiqqud
  ${"syllable with patah"}        | ${"הַֽ֭יְחָבְרְךָ"} | ${0}        | ${"PATAH"}  | ${false}
  ${"syllable with sheva"}        | ${"הַֽ֭יְחָבְרְךָ"} | ${1}        | ${"SHEVA"}  | ${false}
  ${"syllable with silent sheva"} | ${"הַֽ֭יְחָבְרְךָ"} | ${2}        | ${"QAMATS"} | ${false}
  ${"syllable with none"}         | ${"test"}           | ${0}        | ${null}     | ${true}
  ${"syllable with shureq"}       | ${"תִגְּע֖וּ"}      | ${2}        | ${"SHUREQ"} | ${false}
  ${"syllable with tsere-yod"}    | ${"קָדְשֵׁ֧י"}      | ${1}        | ${"TSERE"}  | ${false}
  ${"syllable with holam-vav"}    | ${"בַּיּ֣וֹם"}      | ${1}        | ${"HOLAM"}  | ${false}
  ${"syllable with hiriq-yod"}    | ${"אָנֹֽכִי"}       | ${2}        | ${"HIRIQ"}  | ${false}
  ${"syllable with mixed chars"}  | ${"rˁִː֣"}          | ${0}        | ${"HIRIQ"}  | ${true}
`("vowelName:", ({ description, hebrew, syllableNum, vowelName, allowNoNiqqud }) => {
  // normally don't use `allowNoNiqqud` in testing, but needed to get `null`
  const heb = new Text(hebrew, { allowNoNiqqud });
  const syllable = heb.syllables[syllableNum];
  const syllableVowelName = syllable.vowelName;
  describe(description, () => {
    test(`vowelName to equal ${vowelName}`, () => {
      expect(syllableVowelName).toEqual(vowelName);
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
