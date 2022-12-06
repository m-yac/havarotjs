import { removeTaamim } from "./removeTaamim";
import { SylOpts } from "../text";

export const holemWaw = (word: string, options: SylOpts): string => {
  const wawRegX = /\u{05D5}/u;
  const holemRegx = /\u{05B9}/u;
  const holemHaser = /\u{05BA}/u;
  const wawHolemRegX = /\u{05D5}\u{05B9}/u;
  const vowels = /[\u{05B0}-\u{05BB}\u{05C7}]/u;
  const vowelBeforeWawHolem = new RegExp("(?<!" + vowels.source + ")" + wawHolemRegX.source, "gu");

  // replace holem haser with regular holem
  if (options.holemHaser === "remove" && holemHaser.test(word)) {
    word = word.replace(holemHaser, "\u{05B9}");
  }

  // if there is no waw or holem or waw + holem patter, there is nothing to check
  if (!wawRegX.test(word) || !holemRegx.test(word) || !wawHolemRegX.test(word)) {
    return word;
  }

  const [noTaamim, charPos] = removeTaamim(word);

  // check for waw + holem preceded by vowel
  // b/c the text is sequenced if there is a taam on the vav
  // it wouldn't find the pattern
  const matches = noTaamim.matchAll(vowelBeforeWawHolem);
  if (!matches) {
    return word;
  }

  for (const match of matches) {
    const start = charPos[match.index!]; // eslint-disable-line
    const end = charPos[match[0].length] + start;
    word =
      word.substring(0, start) +
      "\u{05B9}\u{05D5}" +
      (word.substring(end).trim() ? word.substring(end) : word.substring(end - 1)).replace(holemRegx, "");
  }

  return word;
};
