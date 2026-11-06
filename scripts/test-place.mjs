// Where a cheat sheet tap lands. Extracts place() from index.html (the block between // PLACE-START and // PLACE-END)
// and runs the cases below. Usage: node scripts/test-place.mjs [path/to/index.html]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const file = process.argv[2] || path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "index.html");
const html = fs.readFileSync(file, "utf8");
const m = html.match(/\/\/ PLACE-START([\s\S]*?)\/\/ PLACE-END/);
if (!m) throw new Error("no PLACE-START / PLACE-END block in " + file);
const place = new Function(m[1] + "\nreturn place;")();

let fails = 0;
function t(name, got, value, caret) {
  const ok = got.value === value && got.caret === caret;
  if (!ok) fails++;
  console.log((ok ? "ok  " : "FAIL") + " " + name + (ok ? "" : `\n     got   ${JSON.stringify(got)}\n     want  ${JSON.stringify({ value, caret })}`));
}
// Taps in a row, each landing at the caret the one before left.
const taps = (v, ...list) => list.reduce((r, [ins, kind]) => place(r.value, r.caret, r.caret, ins, kind), { value: v, caret: v.length });
const W = (w) => [w, "word"], G = (g) => [g, "glue"], C = ["", "cartouche"];

// words
t("empty box, tap toki", place("", 0, 0, "toki", "word"), "toki ", 5);
t("three taps at the end", taps("", W("mi"), W("moku"), W("pona")), "mi moku pona ", 13);
t("pona before the full stop", place("mi moku.", 7, 7, "pona", "word"), "mi moku pona.", 12);
t("between two words", place("mi moku", 2, 2, "pona", "word"), "mi pona moku", 7);
t("replace a selection", place("mi moku", 3, 7, "pona", "word"), "mi pona ", 8);
t("caret after a trailing space", place("mi ", 3, 3, "moku", "word"), "mi moku ", 8);
t("before a comma", place("mi moku, sina", 7, 7, "pona", "word"), "mi moku pona, sina", 12);
t("alt tile", place("", 0, 0, "mute1", "word"), "mute1 ", 6);
t("caret at the end of the text", place("mi", 2, 2, "pona", "word"), "mi pona ", 8);
t("word after a glue mark gets no space", place("toki&", 5, 5, "pona", "word"), "toki&pona ", 10);
t("word after a newline", place("toki\n", 5, 5, "pona", "word"), "toki\npona ", 10);
t("word before a newline", place("toki\nmi", 4, 4, "pona", "word"), "toki pona\nmi", 9);
t("word inside a cartouche before the ]", place("[ilo]", 4, 4, "pona", "word"), "[ilo pona]", 9);
t("inside empty brackets a word gets no space against them", place("[]", 1, 1, "jan", "word"), "[jan]", 4);

// glue marks
t("& snaps to the word before", place("tomo ", 5, 5, "&", "glue"), "tomo&", 5);
t("tomo & telo", taps("tomo ", G("&"), W("telo")), "tomo&telo ", 10);
t("+ after a word without a space", place("kala", 4, 4, "+", "glue"), "kala+", 5);
t("glue after an alt tile", place("mute1 ", 6, 6, "&", "glue"), "mute1&", 6);
t("glue before another word keeps that word", place("toki mi", 4, 4, "&", "glue"), "toki& mi", 5);
t("glue with a selection snaps to its end, keeping the word", place("toki pona mi", 5, 9, "&", "glue"), "toki pona& mi", 10);
t("glue in an empty box leaves it alone", place("", 0, 0, "-", "glue"), "", 0);
t("glue at the start of the text leaves it alone", place("toki", 0, 0, "&", "glue"), "toki", 0);
t("syllable tick snaps to the glyph in a cartouche", place("[pona", 5, 5, ",", "glue"), "[pona,", 6);
t("a second tick follows the first", place("[pona,", 6, 6, ",", "glue"), "[pona,,", 7);
t("a tick before the ] keeps the ]", place("[pona]", 5, 5, ",", "glue"), "[pona,]", 6);
t("other glue marks still refuse to follow a tick", place("[pona,", 6, 6, "&", "glue"), "[pona,", 6);
t("glue after a full stop leaves it alone", place("toki.", 5, 5, "&", "glue"), "toki.", 5);
t("glue after a glue mark leaves it alone", place("toki&", 5, 5, "-", "glue"), "toki&", 5);
t("glue after [ leaves it alone", place("[", 1, 1, "&", "glue"), "[", 1);
t("glue after ] leaves it alone", place("[ilo]", 5, 5, "&", "glue"), "[ilo]", 5);

// cartouche: fresh
t("[ ] in an empty box", place("", 0, 0, "", "cartouche"), "[]", 1);
t("[ ] after a word", place("toki", 4, 4, "", "cartouche"), "toki []", 6);
t("[ ] before a word", place("toki", 0, 0, "", "cartouche"), "[] toki", 1);
t("[ ] between words", place("toki mi", 4, 4, "", "cartouche"), "toki [] mi", 6);
t("[ ] after a glue mark", place("toki&", 5, 5, "", "cartouche"), "toki&[]", 6);
t("a whitespace-only selection gets a fresh cartouche", place("toki  mi", 4, 6, "", "cartouche"), "toki [] mi", 6);

// cartouche: fill and step out
const filled = taps("", C, W("mama"), W("ala"), W("lipu"), W("ilo"));
t("fill a cartouche", filled, "[mama ala lipu ilo]", 18);
const out = place(filled.value, filled.caret, filled.caret, "", "cartouche");
t("step out of the cartouche", out, "[mama ala lipu ilo] ", 20);
t("word after stepping out", place(out.value, out.caret, out.caret, "pona", "word"), "[mama ala lipu ilo] pona ", 25);
t("step out when the ] is missing", place("[mama", 5, 5, "", "cartouche"), "[mama] ", 7);
t("step out when the ] is missing, before a space", place("[ilo pona", 4, 4, "", "cartouche"), "[ilo] pona", 6);
t("step out onto an existing space", place("[mama] pona", 5, 5, "", "cartouche"), "[mama] pona", 7);
t("step out from the middle of the name", place("[ilo pona] mi", 4, 4, "", "cartouche"), "[ilo pona] mi", 11);
t("step out with a selection inside keeps the text", place("[ilo pona] mi", 1, 4, "", "cartouche"), "[ilo pona] mi", 11);
t("a selection inside an unclosed cartouche closes it after the selection", place("[ilo pona", 1, 4, "", "cartouche"), "[ilo] pona", 6);
t("a selection inside, ] then a space", place("[ilo]  mi", 1, 4, "", "cartouche"), "[ilo]  mi", 6);

// cartouche: wrap a selection
t("wrap a selection", place("jan Mali", 4, 8, "", "cartouche"), "jan [Mali] ", 11);
t("wrap keeps the outer whitespace outside the brackets", place("toki pona mi", 4, 10, "", "cartouche"), "toki [pona] mi", 11);
t("wrap a double-click selection with its trailing space", place("jan Mali mi", 4, 9, "", "cartouche"), "jan [Mali] mi", 10);
t("wrap adds the spaces the words need", place("tokipona", 4, 8, "", "cartouche"), "toki [pona] ", 12);
t("wrap before punctuation", place("jan Mali.", 4, 8, "", "cartouche"), "jan [Mali].", 10);

console.log(fails ? `\n${fails} failing` : "\nall passed");
process.exit(fails ? 1 : 0);
