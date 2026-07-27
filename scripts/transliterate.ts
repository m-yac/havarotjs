import { DefaultTransliterationScheme } from "../src/transliteration";

// Transliterate the given input, which is either a bare string or a JSON
// encoded array of pages of lines of texts
const input = process.argv[2];
const scheme = new DefaultTransliterationScheme();
try {
  const pageData = JSON.parse(input) as string[][][];
  process.stdout.write(JSON.stringify(
      pageData.map((lineData) =>
        lineData.map((textData) =>
          textData.map((text) =>
            scheme.trl(text) )))) + "\n"
  );
} catch {
  process.stdout.write(JSON.stringify(scheme.trl(input)) + "\n");
}
